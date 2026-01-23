import { MessageCircle, ArrowLeft, Users, Settings, AlertTriangle } from "lucide-react";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMessages } from "@/hooks/useMessages";
import { useChatPresence } from "@/hooks/useChatPresence";
import { useChatSounds } from "@/hooks/useChatSounds";
import { isSameDay } from "date-fns";
import { GroupSettingsSheet } from "@/components/messages/GroupSettingsSheet";
import { ReportMessageModal } from "@/components/messages/ReportMessageModal";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { DateSeparator } from "@/components/chat/DateSeparator";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { ChatInput } from "@/components/chat/ChatInput";
import { OnlineStatusDot } from "@/components/chat/OnlineStatusDot";
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

const Chat = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { sendMessage, getMessages, markAsRead, subscribeToMessages, unsubscribe, addReaction } = useMessages();
  const { typingUsers, onlineUsers, startTyping, stopTyping } = useChatPresence(conversationId);
  const { playSound } = useChatSounds();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [groupSettingsOpen, setGroupSettingsOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportingMessage, setReportingMessage] = useState<{ id: string; senderId: string } | null>(null);
  const [isBanned, setIsBanned] = useState(false);
  const [bannedUntil, setBannedUntil] = useState<Date | null>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; content: string; senderName: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversation details
  useEffect(() => {
    const loadConversation = async () => {
      if (!conversationId || !user) return;

      try {
        const { data: convoData, error: convoError } = await supabase
          .from("conversations")
          .select("id, name, is_group, image_url")
          .eq("id", conversationId)
          .single();

        if (convoError) throw convoError;

        const { data: participantsData, error: participantsError } = await supabase
          .from("conversation_participants")
          .select("user_id")
          .eq("conversation_id", conversationId);

        if (participantsError) throw participantsError;

        // Fetch profiles using the public RPC function (works with RLS)
        const userIds = participantsData?.map(p => p.user_id) || [];
        const { data: profilesData } = await supabase.rpc("get_public_profiles");

        const profilesMap = new Map(
          (profilesData || [])
            .filter((p: any) => userIds.includes(p.user_id))
            .map((p: any) => [p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url }])
        );

        const participants = (participantsData || []).map((p: any) => ({
          user_id: p.user_id,
          profile: profilesMap.get(p.user_id) || { full_name: null, avatar_url: null },
        }));

        setConversation({
          ...convoData,
          participants,
        });
      } catch (error) {
        console.error("Error loading conversation:", error);
        toast.error(t("chat.conversationNotFound"));
        navigate("/friends");
      } finally {
        setLoading(false);
      }
    };

    loadConversation();
  }, [conversationId, user, navigate, t]);

  // Check if user is banned
  useEffect(() => {
    const checkBan = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("user_bans")
        .select("banned_until")
        .eq("user_id", user.id)
        .gt("banned_until", new Date().toISOString())
        .order("banned_until", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setIsBanned(true);
        setBannedUntil(new Date(data.banned_until));
      } else {
        setIsBanned(false);
        setBannedUntil(null);
      }
    };
    checkBan();
  }, [user]);

  // Load messages and subscribe to updates
  useEffect(() => {
    if (!conversationId) return;

    const loadMessages = async () => {
      const { data } = await getMessages(conversationId);
      if (data) {
        setMessages(data);
      }
      markAsRead(conversationId);
    };

    loadMessages();

    // Subscribe to real-time messages and updates
    subscribeToMessages(
      conversationId, 
      // On new message
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
      // On message update (reactions, read status)
      (updatedMsg) => {
        setMessages((prev) => 
          prev.map((m) => m.id === updatedMsg.id ? updatedMsg : m)
        );
      }
    );

    return () => {
      unsubscribe();
      stopTyping();
    };
  }, [conversationId, user?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (content: string, imageUrl?: string) => {
    if ((!content.trim() && !imageUrl) || !conversationId) return;

    if (isBanned && bannedUntil) {
      toast.error(
        language === 'fr'
          ? `Vous êtes banni jusqu'à ${bannedUntil.toLocaleTimeString("fr-FR")}`
          : `You are banned until ${bannedUntil.toLocaleTimeString("en-US")}`
      );
      return;
    }

    setSending(true);
    stopTyping();
    
    const { error } = await sendMessage(conversationId, content, imageUrl, replyTo?.id);
    
    if (error) {
      toast.error(language === 'fr' ? "Erreur d'envoi" : "Failed to send");
    } else {
      playSound("send");
    }
    
    setReplyTo(null);
    setSending(false);
  };

  const handleReact = async (messageId: string, emoji: string) => {
    const { error } = await addReaction(messageId, emoji);
    if (!error) {
      // Update local state immediately for better UX
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          const reactions = { ...(msg.reactions || {}) };
          const userReactions = reactions[emoji] || [];
          if (userReactions.includes(user?.id || '')) {
            reactions[emoji] = userReactions.filter(id => id !== user?.id);
            if (reactions[emoji].length === 0) {
              delete reactions[emoji];
            }
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

  const handleReport = (messageId: string, senderId: string) => {
    setReportingMessage({ id: messageId, senderId });
    setReportModalOpen(true);
  };

  const handleLeaveGroup = () => {
    navigate("/friends");
  };

  // Get display info for the conversation header
  const displayInfo = useMemo(() => {
    if (!conversation) return { name: "", image: null, initials: "?", isOnline: false };

    if (conversation.is_group) {
      return {
        name: conversation.name || (language === 'fr' ? "Groupe" : "Group"),
        image: conversation.image_url,
        initials: (conversation.name || "G").charAt(0).toUpperCase(),
        isOnline: false,
      };
    }

    const other = conversation.participants.find((p) => p.user_id !== user?.id);
    const isOnline = other ? onlineUsers.includes(other.user_id) : false;
    
    return {
      name: other?.profile?.full_name || (language === 'fr' ? "Utilisateur" : "User"),
      image: other?.profile?.avatar_url,
      initials: (other?.profile?.full_name || "?").charAt(0).toUpperCase(),
      isOnline,
    };
  }, [conversation, user?.id, onlineUsers, language]);

  // Group messages by date and consecutive sender
  const groupedMessages = useMemo(() => {
    const groups: { date: Date; messages: (Message & { showAvatar: boolean; showTimestamp: boolean })[] }[] = [];
    let currentDate: Date | null = null;
    let currentGroup: (Message & { showAvatar: boolean; showTimestamp: boolean })[] = [];

    messages.forEach((msg, index) => {
      const msgDate = new Date(msg.created_at);
      const nextMsg = messages[index + 1];
      const prevMsg = messages[index - 1];

      if (!currentDate || !isSameDay(currentDate, msgDate)) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate!, messages: currentGroup });
        }
        currentDate = msgDate;
        currentGroup = [];
      }

      const isLastInGroup =
        !nextMsg ||
        nextMsg.sender_id !== msg.sender_id ||
        new Date(nextMsg.created_at).getTime() - msgDate.getTime() > 60000;

      const isFirstInGroup =
        !prevMsg ||
        prevMsg.sender_id !== msg.sender_id ||
        msgDate.getTime() - new Date(prevMsg.created_at).getTime() > 60000;

      currentGroup.push({
        ...msg,
        showAvatar: isFirstInGroup,
        showTimestamp: isLastInGroup,
      });
    });

    if (currentGroup.length > 0 && currentDate) {
      groups.push({ date: currentDate, messages: currentGroup });
    }

    return groups;
  }, [messages]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background">
        <MessageCircle className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{t("chat.conversationNotFound")}</p>
        <button
          onClick={() => navigate("/friends")}
          className="mt-4 text-primary hover:underline"
        >
          {t("chat.back")}
        </button>
      </div>
    );
  }

  const isGroup = conversation.is_group;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-background border-b border-border">
        <button
          onClick={() => navigate("/friends")}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        
        {/* Avatar with online indicator */}
        <div className="relative">
          <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center overflow-hidden">
            {displayInfo.image ? (
              <img src={displayInfo.image} alt="" className="w-full h-full object-cover" />
            ) : isGroup ? (
              <Users className="h-5 w-5 text-primary-foreground" />
            ) : (
              <span className="font-bold text-primary-foreground text-lg">{displayInfo.initials}</span>
            )}
          </div>
          {!isGroup && (
            <div className="absolute -bottom-0.5 -right-0.5">
              <OnlineStatusDot isOnline={displayInfo.isOnline} size="md" />
            </div>
          )}
        </div>
        
        {/* Name and status */}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold truncate text-foreground">{displayInfo.name}</h2>
          {!isGroup && (
            <p className={`text-xs flex items-center gap-1 transition-colors ${displayInfo.isOnline ? 'text-green-500' : 'text-muted-foreground'}`}>
              {displayInfo.isOnline 
                ? (language === 'fr' ? 'En ligne' : 'Online')
                : (language === 'fr' ? 'Hors ligne' : 'Offline')
              }
            </p>
          )}
        </div>
        
        {isGroup && (
          <button
            onClick={() => setGroupSettingsOpen(true)}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
          >
            <Settings className="h-5 w-5 text-muted-foreground" />
          </button>
        )}
      </header>

      {/* Ban warning */}
      {isBanned && bannedUntil && (
        <div className="mx-4 mt-3 p-3 bg-destructive/10 border border-destructive/30 rounded-xl flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
          <div className="text-sm">
            <span className="font-medium text-destructive">{t("messages.bannedUntil")}</span>
            <p className="text-muted-foreground">
              {t("messages.bannedMessage")} {bannedUntil.toLocaleTimeString(language === 'fr' ? "fr-FR" : "en-US")}
            </p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MessageCircle className="h-8 w-8 text-primary" />
            </div>
            <p className="text-muted-foreground">{t("messages.startConversation")}</p>
          </div>
        ) : (
          <div>
            {groupedMessages.map((group) => (
              <div key={group.date.toISOString()}>
                <DateSeparator date={group.date} />
                <div className="space-y-0.5">
                  {group.messages.map((msg) => {
                    // Find reply-to message if exists
                    const replyToMessage = msg.reply_to_id 
                      ? messages.find(m => m.id === msg.reply_to_id)
                      : null;
                    
                    return (
                      <MessageBubble
                        key={msg.id}
                        id={msg.id}
                        content={msg.content}
                        timestamp={msg.created_at}
                        isMe={msg.sender_id === user?.id}
                        isGroup={isGroup}
                        sender={msg.sender}
                        readAt={msg.read_at}
                        showAvatar={msg.showAvatar}
                        showTimestamp={msg.showTimestamp}
                        onReport={handleReport}
                        senderId={msg.sender_id}
                        reactions={msg.reactions || {}}
                        onReact={handleReact}
                        replyTo={replyToMessage ? {
                          content: replyToMessage.content,
                          senderName: replyToMessage.sender?.full_name || (language === 'fr' ? 'Utilisateur' : 'User'),
                        } : null}
                        onReply={handleReply}
                        imageUrl={msg.image_url}
                        currentUserId={user?.id}
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

      {/* Typing indicator */}
      <TypingIndicator users={typingUsers} />

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        onTyping={startTyping}
        disabled={isBanned}
        disabledMessage={isBanned ? t("messages.suspended") : undefined}
        sending={sending}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
      />

      {/* Group Settings Sheet */}
      {isGroup && (
        <GroupSettingsSheet
          open={groupSettingsOpen}
          onOpenChange={setGroupSettingsOpen}
          conversationId={conversationId || ""}
          onLeaveGroup={handleLeaveGroup}
        />
      )}

      {/* Report Message Modal */}
      {reportingMessage && (
        <ReportMessageModal
          open={reportModalOpen}
          onOpenChange={(open) => {
            setReportModalOpen(open);
            if (!open) setReportingMessage(null);
          }}
          messageId={reportingMessage.id}
          reportedUserId={reportingMessage.senderId}
        />
      )}
    </div>
  );
};

export default Chat;
