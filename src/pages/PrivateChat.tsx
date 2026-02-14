import { ArrowLeft, Lock } from "lucide-react";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMessages } from "@/hooks/useMessages";
import { useChatPresence } from "@/hooks/useChatPresence";
import { useChatSounds } from "@/hooks/useChatSounds";
import { useEncryption } from "@/hooks/useEncryption";
import { isSameDay } from "date-fns";
import { PrivateChatHeader } from "@/components/chat/PrivateChatHeader";
import { PrivateMessageBubble } from "@/components/chat/PrivateMessageBubble";
import { DateSeparator } from "@/components/chat/DateSeparator";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { PrivateChatInput } from "@/components/chat/PrivateChatInput";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  read_at: string | null;
  created_at: string;
  reactions?: Record<string, string[]>;
  reply_to_id?: string | null;
  image_url?: string | null;
  encrypted_keys?: Record<string, string> | null;
  sender?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface Participant {
  user_id: string;
  profile: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface Conversation {
  id: string;
  name: string | null;
  is_group: boolean;
  image_url: string | null;
  participants: Participant[];
}

const PrivateChat = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const { sendMessage, getMessages, markAsRead, subscribeToMessages, unsubscribe, addReaction } = useMessages();
  const { typingUsers, onlineUsers, startTyping, stopTyping } = useChatPresence(conversationId);
  const { playSound } = useChatSounds();
  const { isInitialized: encryptionReady, hasEncryption, encryptForRecipients, decryptMessageContent } = useEncryption();
  const [decryptedMessages, setDecryptedMessages] = useState<Map<string, string>>(new Map());
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<{ id: string; content: string; senderName: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversation details
  useEffect(() => {
    const loadConversation = async () => {
      if (!conversationId || !user) return;
      try {
        const { data: convoData, error: convoError } = await supabase
          .from("conversations").select("id, name, is_group, image_url").eq("id", conversationId).single();
        if (convoError) throw convoError;

        const { data: participantsData, error: participantsError } = await supabase
          .from("conversation_participants").select("user_id").eq("conversation_id", conversationId);
        if (participantsError) throw participantsError;

        const userIds = participantsData?.map(p => p.user_id) || [];
        const { data: profilesData } = await supabase.rpc("get_public_profiles");
        const profilesMap = new Map(
          (profilesData || []).filter((p: any) => userIds.includes(p.user_id))
            .map((p: any) => [p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url }])
        );

        const participants = (participantsData || []).map((p: any) => ({
          user_id: p.user_id,
          profile: profilesMap.get(p.user_id) || { full_name: null, avatar_url: null },
        }));

        setConversation({ ...convoData, participants });
      } catch (error) {
        console.error("Error loading conversation:", error);
        toast.error(language === 'fr' ? "Conversation introuvable" : "Conversation not found");
        navigate("/friends");
      } finally {
        setLoading(false);
      }
    };
    loadConversation();
  }, [conversationId, user, navigate, language]);

  // Load messages and subscribe
  useEffect(() => {
    if (!conversationId) return;
    const loadMessages = async () => {
      const { data } = await getMessages(conversationId);
      if (data) setMessages(data);
      markAsRead(conversationId);
    };
    loadMessages();

    subscribeToMessages(
      conversationId, 
      (newMsg) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        if (newMsg.sender_id !== user?.id) {
          playSound("receive");
          markAsRead(conversationId);
        }
      },
      (updatedMsg) => {
        setMessages((prev) => prev.map((m) => m.id === updatedMsg.id ? updatedMsg : m));
      }
    );

    return () => { unsubscribe(); stopTyping(); };
  }, [conversationId, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Decrypt encrypted messages
  useEffect(() => {
    const decryptMessages = async () => {
      if (!encryptionReady || !hasEncryption) return;
      for (const msg of messages) {
        if (msg.message_type === "encrypted" && msg.encrypted_keys && !decryptedMessages.has(msg.id)) {
          try {
            const encrypted = JSON.parse(msg.content);
            const decrypted = await decryptMessageContent(encrypted, msg.encrypted_keys);
            if (decrypted) setDecryptedMessages(prev => new Map(prev).set(msg.id, decrypted));
          } catch (error) { console.error("Failed to decrypt message:", error); }
        }
      }
    };
    decryptMessages();
  }, [messages, encryptionReady, hasEncryption, decryptMessageContent, decryptedMessages]);

  const handleSend = async (content: string, imageUrl?: string) => {
    if ((!content.trim() && !imageUrl) || !conversationId || !conversation) return;
    setSending(true);
    stopTyping();
    
    const recipientIds = conversation.participants.map(p => p.user_id);
    let encryptedContent: { iv: number[]; data: number[] } | undefined;
    let encryptedKeys: Record<string, string> | undefined;
    
    if (hasEncryption && !imageUrl) {
      const encrypted = await encryptForRecipients(content, recipientIds);
      if (encrypted && Object.keys(encrypted.encryptedKeys).length === recipientIds.length) {
        encryptedContent = encrypted.encrypted;
        encryptedKeys = encrypted.encryptedKeys;
      }
    }
    
    const { error } = await sendMessage(conversationId, content, imageUrl, replyTo?.id, encryptedContent, encryptedKeys);
    if (error) {
      toast.error(language === 'fr' ? "Erreur d'envoi" : "Failed to send");
    } else {
      playSound("send");
      if (encryptedContent) {
        setMessages(prev => {
          const lastMsg = [...prev].reverse().find(m => m.sender_id === user?.id && m.message_type === "encrypted");
          if (lastMsg && !decryptedMessages.has(lastMsg.id)) {
            setDecryptedMessages(p => new Map(p).set(lastMsg.id, content));
          }
          return prev;
        });
      }
    }
    setReplyTo(null);
    setSending(false);
  };

  const handleReact = async (messageId: string, emoji: string) => {
    const { error } = await addReaction(messageId, emoji);
    if (!error) {
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          const reactions = { ...(msg.reactions || {}) };
          const userReactions = reactions[emoji] || [];
          if (userReactions.includes(user?.id || '')) {
            reactions[emoji] = userReactions.filter(id => id !== user?.id);
            if (reactions[emoji].length === 0) delete reactions[emoji];
          } else {
            reactions[emoji] = [...userReactions, user?.id || ''];
          }
          return { ...msg, reactions };
        }
        return msg;
      }));
    }
  };

  const handleReply = (messageId: string, content: string, senderName: string) => {
    setReplyTo({ id: messageId, content, senderName });
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    const { error } = await supabase
      .from("messages")
      .update({ content: newContent })
      .eq("id", messageId);
    
    if (error) {
      toast.error(language === 'fr' ? "Erreur de modification" : "Edit failed");
    } else {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: newContent } : m));
      toast.success(language === 'fr' ? "Message modifié" : "Message edited");
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("id", messageId);
    
    if (error) {
      toast.error(language === 'fr' ? "Erreur de suppression" : "Delete failed");
    } else {
      setMessages(prev => prev.filter(m => m.id !== messageId));
      toast.success(language === 'fr' ? "Message retiré" : "Message unsent");
    }
  };

  const displayInfo = useMemo(() => {
    if (!conversation) return { name: "", image: null, initials: "?", isOnline: false, otherUserId: null };
    const other = conversation.participants.find((p) => p.user_id !== user?.id);
    const isOnline = other ? onlineUsers.includes(other.user_id) : false;
    return {
      name: other?.profile?.full_name || (language === 'fr' ? "Utilisateur" : "User"),
      image: other?.profile?.avatar_url,
      initials: (other?.profile?.full_name || "?").charAt(0).toUpperCase(),
      isOnline,
      otherUserId: other?.user_id || null,
    };
  }, [conversation, user?.id, onlineUsers, language]);

  const groupedMessages = useMemo(() => {
    const groups: { date: Date; messages: (Message & { showAvatar: boolean; showTimestamp: boolean })[] }[] = [];
    let currentDate: Date | null = null;
    let currentGroup: (Message & { showAvatar: boolean; showTimestamp: boolean })[] = [];

    messages.forEach((msg, index) => {
      const msgDate = new Date(msg.created_at);
      const nextMsg = messages[index + 1];
      const prevMsg = messages[index - 1];

      if (!currentDate || !isSameDay(currentDate, msgDate)) {
        if (currentGroup.length > 0) groups.push({ date: currentDate!, messages: currentGroup });
        currentDate = msgDate;
        currentGroup = [];
      }

      const isLastInGroup = !nextMsg || nextMsg.sender_id !== msg.sender_id || new Date(nextMsg.created_at).getTime() - msgDate.getTime() > 60000;
      const isFirstInGroup = !prevMsg || prevMsg.sender_id !== msg.sender_id || msgDate.getTime() - new Date(prevMsg.created_at).getTime() > 60000;

      currentGroup.push({ ...msg, showAvatar: isFirstInGroup, showTimestamp: isLastInGroup });
    });

    if (currentGroup.length > 0 && currentDate) groups.push({ date: currentDate, messages: currentGroup });
    return groups;
  }, [messages]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">{language === 'fr' ? 'Chargement...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background">
        <p className="text-muted-foreground">{language === 'fr' ? 'Conversation introuvable' : 'Conversation not found'}</p>
        <button onClick={() => navigate("/friends")} className="mt-4 text-primary hover:underline">
          {language === 'fr' ? 'Retour' : 'Back'}
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <PrivateChatHeader
        name={displayInfo.name}
        avatarUrl={displayInfo.image}
        initials={displayInfo.initials}
        isOnline={displayInfo.isOnline}
        onBack={() => navigate("/friends")}
        onProfileClick={() => { if (displayInfo.otherUserId) navigate(`/user/${displayInfo.otherUserId}`); }}
      />

      {hasEncryption && (
        <div className="flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          <span>{language === 'fr' ? 'Chiffrement activé' : 'Encryption enabled'}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4 overflow-hidden">
              {displayInfo.image ? (
                <img src={displayInfo.image} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-muted-foreground">{displayInfo.initials}</span>
              )}
            </div>
            <p className="text-lg font-semibold text-foreground mb-1">{displayInfo.name}</p>
            <p className="text-sm text-muted-foreground">{language === 'fr' ? 'Démarrez la conversation' : 'Start the conversation'}</p>
          </div>
        ) : (
          <div>
            {groupedMessages.map((group) => (
              <div key={group.date.toISOString()}>
                <DateSeparator date={group.date} />
                <div className="space-y-0.5">
                  {group.messages.map((msg) => {
                    const replyToMessage = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) : null;
                    const displayContent = msg.message_type === "encrypted" 
                      ? (decryptedMessages.get(msg.id) || (language === 'fr' ? '🔒 Chiffré' : '🔒 Encrypted'))
                      : msg.content;
                    const replyContent = replyToMessage?.message_type === "encrypted"
                      ? (decryptedMessages.get(replyToMessage.id) || '🔒')
                      : replyToMessage?.content;
                    
                    return (
                      <PrivateMessageBubble
                        key={msg.id}
                        id={msg.id}
                        content={displayContent}
                        timestamp={msg.created_at}
                        isMe={msg.sender_id === user?.id}
                        sender={msg.sender}
                        readAt={msg.read_at}
                        showTimestamp={msg.showTimestamp}
                        reactions={msg.reactions || {}}
                        onReact={handleReact}
                        replyTo={replyToMessage ? {
                          content: replyContent || '',
                          senderName: replyToMessage.sender?.full_name || (language === 'fr' ? 'Utilisateur' : 'User'),
                        } : null}
                        onReply={handleReply}
                        imageUrl={msg.image_url}
                        currentUserId={user?.id}
                        onEdit={msg.sender_id === user?.id && msg.message_type !== "encrypted" ? handleEditMessage : undefined}
                        onDelete={msg.sender_id === user?.id ? handleDeleteMessage : undefined}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <TypingIndicator users={typingUsers} />

      <PrivateChatInput
        onSend={handleSend}
        onTyping={startTyping}
        sending={sending}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
        otherUserId={displayInfo.otherUserId}
      />
    </div>
  );
};

export default PrivateChat;
