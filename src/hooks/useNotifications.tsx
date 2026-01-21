import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AppNotification {
  id: string;
  type: "message" | "wishlist" | "sale" | "system";
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  data?: Record<string, unknown>;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");

  // Check push permission status
  useEffect(() => {
    if ("Notification" in window) {
      setPushPermission(Notification.permission);
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

      setNotifications(mockNotifications);
      setUnreadCount(mockNotifications.filter((n) => !n.read).length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Show browser push notification
  const showPushNotification = useCallback((title: string, body: string, options?: NotificationOptions) => {
    if ("Notification" in window && Notification.permission === "granted") {
      const notification = new Notification(title, {
        body,
        icon: "/favicon.png",
        badge: "/favicon.png",
        tag: options?.tag || "default",
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    }
    return null;
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Subscribe to new messages for real-time notifications
    if (user) {
      const channel = supabase
        .channel("notifications-realtime")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
          },
          async (payload) => {
            if (payload.new && payload.new.sender_id !== user.id) {
              // Fetch sender info for the notification
              const { data: senderProfile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("user_id", payload.new.sender_id)
                .single();

              const senderName = senderProfile?.full_name || "Quelqu'un";
              const messageContent = (payload.new as { content?: string }).content || "Nouveau message";

              // Show browser push notification if page is hidden
              if (document.hidden && Notification.permission === "granted") {
                showPushNotification(senderName, messageContent, {
                  tag: payload.new.conversation_id as string,
                  data: { conversationId: payload.new.conversation_id },
                });
              }

              // Refresh notifications
              fetchNotifications();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, fetchNotifications, showPushNotification]);

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
      return permission === "granted";
    }
    return false;
  }, []);

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
  };
};

// Re-export the type with a different name for backwards compatibility
export type Notification = AppNotification;
