import { MessageCircle, Send, ArrowLeft, Users, Settings, Flag, AlertTriangle, Phone, Video } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMessages } from "@/hooks/useMessages";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { MainLayout } from "@/components/layout/MainLayout";
import { GroupSettingsSheet } from "@/components/messages/GroupSettingsSheet";
import { ReportMessageModal } from "@/components/messages/ReportMessageModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNotifications } from "@/hooks/useNotifications";

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
  const { sendMessage, getMessages, markAsRead, subscribeToMessages, unsubscribe } = useMessages();
  const { requestPermission } = useNotifications();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [groupSettingsOpen, setGroupSettingsOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportingMessage, setReportingMessage] = useState<{ id: string; senderId: string } | null>(null);
  const [isBanned, setIsBanned] = useState(false);
  const [bannedUntil, setBannedUntil] = useState<Date | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Request notification permission on mount
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  // Load conversation details
  useEffect(() => {
    const loadConversation = async () => {
      if (!conversationId || !user) return;

      try {
        // Get conversation with participants
        const { data: convoData, error: convoError } = await supabase
          .from("conversations")
          .select("id, name, is_group, image_url")
          .eq("id", conversationId)
          .single();

        if (convoError) throw convoError;

        // Get participants with profiles
        const { data: participantsData, error: participantsError } = await supabase
          .from("conversation_participants")
          .select(`
            user_id,
            profile:profiles!conversation_participants_user_id_fkey(full_name, avatar_url)
          `)
          .eq("conversation_id", conversationId);

        if (participantsError) throw participantsError;

        const participants = (participantsData || []).map((p: any) => ({
          user_id: p.user_id,
          profile: Array.isArray(p.profile) ? p.profile[0] : p.profile,
        }));

        setConversation({
          ...convoData,
          participants,
        });
      } catch (error) {
        console.error("Error loading conversation:", error);
        toast.error("Conversation introuvable");
        navigate("/friends");
      } finally {
        setLoading(false);
      }
    };

    loadConversation();
  }, [conversationId, user, navigate]);

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

    // Subscribe to real-time messages
    const channel = subscribeToMessages(conversationId, (newMsg) => {
      setMessages((prev) => [...prev, newMsg]);
      if (newMsg.sender_id !== user?.id) {
        markAsRead(conversationId);
        // Show browser notification
        if (Notification.permission === "granted" && document.hidden) {
          const senderName = newMsg.sender?.full_name || "Nouveau message";
          new Notification(senderName, {
            body: newMsg.content,
            icon: "/favicon.png",
            tag: conversationId,
          });
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [conversationId, user?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !conversationId) return;

    if (isBanned && bannedUntil) {
      toast.error(`Vous êtes banni jusqu'à ${bannedUntil.toLocaleTimeString("fr-FR")}`);
      return;
    }

    setSending(true);
    const { error } = await sendMessage(conversationId, newMessage.trim());

    if (!error) {
      setNewMessage("");
    }
    setSending(false);
  };

  const handleReport = (messageId: string, senderId: string) => {
    setReportingMessage({ id: messageId, senderId });
    setReportModalOpen(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleLeaveGroup = () => {
    navigate("/friends");
  };

  // Get display info for the conversation header
  const getDisplayInfo = useCallback(() => {
    if (!conversation) return { name: "", image: null, initials: "?", subtitle: "" };

    if (conversation.is_group) {
      return {
        name: conversation.name || "Groupe",
        image: conversation.image_url,
        initials: (conversation.name || "G").charAt(0).toUpperCase(),
        subtitle: `${conversation.participants.length} membres`,
      };
    }

    const other = conversation.participants.find((p) => p.user_id !== user?.id);
    return {
      name: other?.profile?.full_name || "Utilisateur",
      image: other?.profile?.avatar_url,
      initials: (other?.profile?.full_name || "?").charAt(0).toUpperCase(),
      subtitle: "En ligne",
    };
  }, [conversation, user?.id]);

  if (loading) {
    return (
      <MainLayout showSearch={false}>
        <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!conversation) {
    return (
      <MainLayout showSearch={false}>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)]">
          <MessageCircle className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Conversation introuvable</p>
        </div>
      </MainLayout>
    );
  }

  const display = getDisplayInfo();
  const isGroup = conversation.is_group;

  return (
    <MainLayout showSearch={false}>
      <div className="h-[calc(100vh-10rem)] flex flex-col -mt-4">
        {/* Ban warning */}
        {isBanned && bannedUntil && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-xl flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
            <div className="text-sm">
              <span className="font-medium text-destructive">Compte temporairement suspendu</span>
              <p className="text-muted-foreground">
                Vous ne pouvez pas envoyer de messages jusqu'à {bannedUntil.toLocaleTimeString("fr-FR")}
              </p>
            </div>
          </div>
        )}

        {/* Chat Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <button
            onClick={() => navigate("/friends")}
            className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
            {display.image ? (
              <img src={display.image} alt="" className="w-full h-full object-cover" />
            ) : isGroup ? (
              <Users className="h-5 w-5 text-primary" />
            ) : (
              <span className="font-bold text-primary">{display.initials}</span>
            )}
          </div>
          <div className="flex-1">
            <h2 className="font-bold">{display.name}</h2>
            <p className="text-sm text-muted-foreground">{display.subtitle}</p>
          </div>
          {isGroup && (
            <button
              onClick={() => setGroupSettingsOpen(true)}
              className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              <Settings className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 py-4 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Commencez la conversation !</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => {
                const isMe = msg.sender_id === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} group`}>
                    <div className={`flex items-start gap-1 max-w-[80%] ${isMe ? "flex-row-reverse" : ""}`}>
                      <div
                        className={`px-4 py-2 rounded-2xl ${
                          isMe
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted rounded-bl-md"
                        }`}
                      >
                        {isGroup && !isMe && msg.sender?.full_name && (
                          <p className="text-xs font-semibold mb-1 text-primary">{msg.sender.full_name}</p>
                        )}
                        <p>{msg.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                          }`}
                        >
                          {formatDistanceToNow(new Date(msg.created_at), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </p>
                      </div>
                      {/* Report button */}
                      {!isMe && (
                        <button
                          onClick={() => handleReport(msg.id, msg.sender_id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                          title="Signaler ce message"
                        >
                          <Flag className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isBanned ? "Vous êtes temporairement suspendu..." : "Écrivez un message..."}
            className="flex-1 bg-muted rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
            disabled={sending || isBanned}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending || isBanned}
            className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>

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
    </MainLayout>
  );
};

export default Chat;
