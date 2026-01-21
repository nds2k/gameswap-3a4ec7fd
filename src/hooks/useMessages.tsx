import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { RealtimeChannel } from "@supabase/supabase-js";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  read_at: string | null;
  created_at: string;
  sender?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  name: string | null;
  image_url: string | null;
  is_group: boolean;
  created_by: string | null;
  participants: {
    user_id: string;
    profile: {
      full_name: string | null;
      avatar_url: string | null;
    } | null;
  }[];
  last_message?: Message;
  unread_count: number;
}

export const useMessages = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChannel, setActiveChannel] = useState<RealtimeChannel | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      // Get conversations where user is a participant
      const { data: participantData, error: participantError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (participantError) throw participantError;

      const conversationIds = participantData?.map((p) => p.conversation_id) || [];

      if (conversationIds.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Get conversation details with participants (including new group fields)
      const { data: convData, error: convError } = await supabase
        .from("conversations")
        .select("id, created_at, updated_at, name, image_url, is_group, created_by")
        .in("id", conversationIds)
        .order("updated_at", { ascending: false });

      if (convError) throw convError;

      // Get all participants for these conversations
      const { data: allParticipants, error: partError } = await supabase
        .from("conversation_participants")
        .select("conversation_id, user_id")
        .in("conversation_id", conversationIds);

      if (partError) throw partError;

      // Get profiles for all participants
      const participantUserIds = [...new Set((allParticipants || []).map((p) => p.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", participantUserIds);

      const profilesMap = new Map(
        (profilesData || []).map((p) => [p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url }])
      );

      // Get last message for each conversation
      const conversationsWithDetails = await Promise.all(
        (convData || []).map(async (conv) => {
          const { data: messages } = await supabase
            .from("messages")
            .select("*")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1);

          const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .neq("sender_id", user.id)
            .is("read_at", null);

          const participants = (allParticipants || [])
            .filter((p) => p.conversation_id === conv.id)
            .map((p) => ({
              user_id: p.user_id,
              profile: profilesMap.get(p.user_id) || null,
            }));

          return {
            id: conv.id,
            created_at: conv.created_at,
            updated_at: conv.updated_at,
            name: conv.name,
            image_url: conv.image_url,
            is_group: conv.is_group || false,
            created_by: conv.created_by,
            participants,
            last_message: messages?.[0],
            unread_count: count || 0,
          };
        })
      );

      setConversations(conversationsWithDetails);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refreshConversations = useCallback(() => {
    fetchConversations();
  }, [fetchConversations]);

  const subscribeToMessages = useCallback((conversationId: string, onNewMessage: (message: Message) => void) => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          
          // Fetch sender profile for the new message
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("user_id", newMsg.sender_id)
            .single();
          
          onNewMessage({
            ...newMsg,
            sender: profileData || { full_name: null, avatar_url: null },
          });
        }
      )
      .subscribe();

    setActiveChannel(channel);
    return channel;
  }, []);

  const unsubscribe = useCallback(() => {
    if (activeChannel) {
      supabase.removeChannel(activeChannel);
      setActiveChannel(null);
    }
  }, [activeChannel]);

  const sendMessage = async (conversationId: string, content: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      message_type: "text",
    });

    if (!error) {
      // Update conversation timestamp
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);
    }

    return { error };
  };

  const getMessages = async (conversationId: string) => {
    const { data: messagesData, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error || !messagesData) return { data: null, error };

    // Get sender profiles
    const senderIds = [...new Set(messagesData.map((m) => m.sender_id))];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url")
      .in("user_id", senderIds);

    const profilesMap = new Map(
      (profilesData || []).map((p) => [p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url }])
    );

    const messagesWithSender = messagesData.map((msg) => ({
      ...msg,
      sender: profilesMap.get(msg.sender_id) || null,
    }));

    return { data: messagesWithSender, error: null };
  };

  const createConversation = async (otherUserId: string) => {
    if (!user) return { data: null, error: new Error("Not authenticated") };

    // Check if conversation already exists (only for 1-on-1 conversations)
    const { data: existingParticipants } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    const myConvIds = existingParticipants?.map((p) => p.conversation_id) || [];

    if (myConvIds.length > 0) {
      // Get non-group conversations
      const { data: nonGroupConvs } = await supabase
        .from("conversations")
        .select("id")
        .in("id", myConvIds)
        .or("is_group.is.null,is_group.eq.false");

      const nonGroupIds = nonGroupConvs?.map((c) => c.id) || [];

      if (nonGroupIds.length > 0) {
        const { data: otherParticipants } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", otherUserId)
          .in("conversation_id", nonGroupIds);

        if (otherParticipants && otherParticipants.length > 0) {
          // Conversation exists
          return { data: { id: otherParticipants[0].conversation_id }, error: null };
        }
      }
    }

    // Create new conversation
    const { data: conv, error: convError } = await supabase
      .from("conversations")
      .insert({ is_group: false })
      .select()
      .single();

    if (convError) return { data: null, error: convError };

    // Add both participants
    const { error: partError } = await supabase.from("conversation_participants").insert([
      { conversation_id: conv.id, user_id: user.id },
      { conversation_id: conv.id, user_id: otherUserId },
    ]);

    if (partError) return { data: null, error: partError };

    return { data: conv, error: null };
  };

  const markAsRead = async (conversationId: string) => {
    if (!user) return;

    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id)
      .is("read_at", null);
  };

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return {
    conversations,
    loading,
    fetchConversations,
    refreshConversations,
    sendMessage,
    getMessages,
    createConversation,
    markAsRead,
    subscribeToMessages,
    unsubscribe,
  };
};
