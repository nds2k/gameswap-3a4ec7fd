import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type NotificationType = "message" | "wishlist" | "sale" | "system" | "payment_request";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  data?: Record<string, unknown>;
}

// Profiles cache to avoid repeated fetches
const profilesCache = new Map<string, { full_name: string; avatar_url: string | null }>();

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");
  const lastNotificationRef = useRef<string | null>(null);

  // Check push permission status
  useEffect(() => {
    if ("Notification" in window) {
      setPushPermission(Notification.permission);
    }
  }, []);

  // Fetch all profiles once for caching
  const fetchProfiles = useCallback(async () => {
    if (profilesCache.size > 0) return;
    
    const { data } = await supabase.rpc("get_public_profiles");
    if (data) {
      data.forEach((p: any) => {
        profilesCache.set(p.user_id, { 
          full_name: p.full_name || "Utilisateur", 
          avatar_url: p.avatar_url 
        });
      });
    }
  }, []);

  // Fetch notifications (mock + real unread messages)
  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      // Fetch unread messages count
      const { count: messagesCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .is("read_at", null)
        .neq("sender_id", user.id);

      // Create notifications from unread messages
      const mockNotifications: AppNotification[] = [];

      if (messagesCount && messagesCount > 0) {
        mockNotifications.push({
          id: "msg-unread",
          type: "message",
          title: "Nouveaux messages",
          body: `Vous avez ${messagesCount} message${messagesCount > 1 ? "s" : ""} non lu${messagesCount > 1 ? "s" : ""}`,
          read: false,
          created_at: new Date().toISOString(),
        });
      }

      // Check for pending payment requests (as buyer)
      const { count: paymentCount } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("buyer_id", user.id)
        .eq("method", "remote")
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString());

      if (paymentCount && paymentCount > 0) {
        mockNotifications.push({
          id: "payment-pending",
          type: "payment_request",
          title: "Demande de paiement",
          body: `Vous avez ${paymentCount} demande${paymentCount > 1 ? "s" : ""} de paiement en attente`,
          read: false,
          created_at: new Date().toISOString(),
          data: { route: "/payment-requests" },
        });
      }

      setNotifications(mockNotifications);
      setUnreadCount(mockNotifications.filter((n) => !n.read).length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Show browser push notification with enhanced options
  const showPushNotification = useCallback((title: string, body: string, options?: NotificationOptions & { vibrate?: boolean }) => {
    if ("Notification" in window && Notification.permission === "granted") {
      // Vibrate on mobile if supported and enabled
      if (options?.vibrate && "vibrate" in navigator) {
        navigator.vibrate([200, 100, 200]);
      }

      const notification = new Notification(title, {
        body,
        icon: "/favicon.png",
        badge: "/favicon.png",
        tag: options?.tag || `msg-${Date.now()}`,
        requireInteraction: false,
        silent: false,
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        // Navigate to conversation if data available
        if (options?.data && typeof options.data === 'object' && 'conversationId' in options.data) {
          window.location.href = `/chat/${options.data.conversationId}`;
        }
      };

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      return notification;
    }
    return null;
  }, []);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Pleasant two-tone notification
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
      oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      // Audio not available
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchProfiles();

    // Subscribe to new messages for real-time notifications
    if (user) {
      const channel = supabase
        .channel("push-notifications-realtime")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
          },
          async (payload) => {
            const newMessage = payload.new as { 
              id: string;
              sender_id: string; 
              content?: string; 
              conversation_id: string;
            };

            // Don't notify for own messages
            if (newMessage.sender_id === user.id) return;

            // Prevent duplicate notifications
            if (lastNotificationRef.current === newMessage.id) return;
            lastNotificationRef.current = newMessage.id;

            // Get sender info from cache or fetch
            let senderProfile = profilesCache.get(newMessage.sender_id);
            if (!senderProfile) {
              const { data: profiles } = await supabase.rpc("get_public_profiles");
              if (profiles) {
                profiles.forEach((p: any) => {
                  profilesCache.set(p.user_id, { 
                    full_name: p.full_name || "Utilisateur", 
                    avatar_url: p.avatar_url 
                  });
                });
                senderProfile = profilesCache.get(newMessage.sender_id);
              }
            }

            const senderName = senderProfile?.full_name || "Quelqu'un";
            const messageContent = newMessage.content || "📷 Image";

            // Show browser push notification if page is hidden or not focused
            if (document.hidden || !document.hasFocus()) {
              showPushNotification(senderName, messageContent, {
                tag: newMessage.conversation_id,
                data: { conversationId: newMessage.conversation_id },
                vibrate: true,
              });

              // Play sound if tab not focused
              playNotificationSound();
            }

            // Refresh notification count
            fetchNotifications();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "transactions",
          },
          async (payload) => {
            const tx = payload.new as {
              id: string;
              seller_id: string;
              buyer_id: string | null;
              method: string;
              status: string;
              amount: number;
              post_id: string;
            };

            // Notify buyer of new payment request
            if (tx.buyer_id === user.id && tx.method === "remote" && tx.status === "pending") {
              let sellerProfile = profilesCache.get(tx.seller_id);
              if (!sellerProfile) {
                await fetchProfiles();
                sellerProfile = profilesCache.get(tx.seller_id);
              }
              const sellerName = sellerProfile?.full_name || "Un vendeur";

              showPushNotification(
                "💳 Demande de paiement reçue",
                `${sellerName} vous demande ${tx.amount}€`,
                {
                  tag: `payment-request-${tx.id}`,
                  data: { route: "/payment-requests" },
                  vibrate: true,
                }
              );
              playNotificationSound();
              fetchNotifications();
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "transactions",
          },
          async (payload) => {
            const tx = payload.new as {
              id: string;
              seller_id: string;
              buyer_id: string | null;
              method: string;
              status: string;
              amount: number;
            };

            // Notify on completed payment
            if (tx.status === "completed") {
              const isRelevant = tx.seller_id === user.id || tx.buyer_id === user.id;
              if (isRelevant) {
                const isSeller = tx.seller_id === user.id;
                showPushNotification(
                  "✅ Paiement réussi",
                  isSeller
                    ? `Vous avez reçu ${tx.amount}€`
                    : `Paiement de ${tx.amount}€ confirmé`,
                  {
                    tag: `payment-completed-${tx.id}`,
                    data: { route: "/payment-requests" },
                    vibrate: true,
                  }
                );
                playNotificationSound();
                fetchNotifications();
              }
            }

            // Notify on expired payment request
            if (tx.status === "expired") {
              if (tx.seller_id === user.id) {
                showPushNotification(
                  "⏰ Demande expirée",
                  `Votre demande de paiement de ${tx.amount}€ a expiré`,
                  {
                    tag: `payment-expired-${tx.id}`,
                    data: { route: "/payment-requests" },
                  }
                );
                fetchNotifications();
              }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, fetchNotifications, fetchProfiles, showPushNotification, playNotificationSound]);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const requestPermission = useCallback(async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      
      // Show a test notification if granted
      if (permission === "granted") {
        showPushNotification("Notifications activées 🎉", "Vous recevrez des alertes pour les nouveaux messages", {
          tag: "permission-granted",
        });
      }
      
      return permission === "granted";
    }
    return false;
  }, [showPushNotification]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    requestPermission,
    refetch: fetchNotifications,
    pushPermission,
    showPushNotification,
    playNotificationSound,
  };
};

// Re-export the type with a different name for backwards compatibility
export type Notification = AppNotification;
