import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { RealtimeChannel } from "@supabase/supabase-js";

interface PresenceState {
  user_id: string;
  name: string;
  avatar?: string | null;
  is_typing: boolean;
  online_at: string;
}

export const useChatPresence = (conversationId: string | undefined) => {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<{ name: string; avatar?: string | null }[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track current user's profile info
  const [myProfile, setMyProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("user_id", user.id)
        .single();
      if (data) setMyProfile(data);
    };
    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (!conversationId || !user || !myProfile) return;

    const channel = supabase.channel(`chat-presence:${conversationId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceState>();
        const users: { name: string; avatar?: string | null }[] = [];
        const online: string[] = [];

        Object.entries(state).forEach(([userId, presences]) => {
          if (userId !== user.id && presences.length > 0) {
            const presence = presences[0] as PresenceState;
            online.push(userId);
            if (presence.is_typing) {
              users.push({ name: presence.name, avatar: presence.avatar });
            }
          }
        });

        setTypingUsers(users);
        setOnlineUsers(online);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: user.id,
            name: myProfile.full_name || "User",
            avatar: myProfile.avatar_url,
            is_typing: false,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, user, myProfile]);

  const setTyping = useCallback(
    async (isTyping: boolean) => {
      if (!channelRef.current || !user || !myProfile) return;

      try {
        await channelRef.current.track({
          user_id: user.id,
          name: myProfile.full_name || "User",
          avatar: myProfile.avatar_url,
          is_typing: isTyping,
          online_at: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Error updating typing status:", error);
      }
    },
    [user, myProfile]
  );

  const startTyping = useCallback(() => {
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set typing to true
    setTyping(true);

    // Auto-stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 3000);
  }, [setTyping]);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setTyping(false);
  }, [setTyping]);

  return {
    typingUsers,
    onlineUsers,
    startTyping,
    stopTyping,
  };
};
