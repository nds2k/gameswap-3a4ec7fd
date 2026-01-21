import { MessageCircle, Send, ArrowLeft, Users, Plus, Settings, Flag, AlertTriangle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMessages } from "@/hooks/useMessages";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { CreateGroupModal } from "@/components/messages/CreateGroupModal";
import { GroupSettingsSheet } from "@/components/messages/GroupSettingsSheet";
import { ReportMessageModal } from "@/components/messages/ReportMessageModal";
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
  sender?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const MessagesTab = () => {
  const { user } = useAuth();
  const {
    conversations,
    loading,
    sendMessage,
    getMessages,
    markAsRead,
    subscribeToMessages,
    unsubscribe,
    refreshConversations,
  } = useMessages();

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [groupSettingsOpen, setGroupSettingsOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportingMessage, setReportingMessage] = useState<{ id: string; senderId: string } | null>(null);
  const [isBanned, setIsBanned] = useState(false);
  const [bannedUntil, setBannedUntil] = useState<Date | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);
  const isGroup = selectedConversation?.is_group;

  // Get display info for conversation
  const getConversationDisplay = (conversation: typeof conversations[0]) => {
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
  };

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

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversationId) {
      loadMessages();
      markAsRead(selectedConversationId);

      // Subscribe to real-time messages
      const channel = subscribeToMessages(selectedConversationId, (newMsg) => {
        setMessages((prev) => [...prev, newMsg]);
        if (newMsg.sender_id !== user?.id) {
          markAsRead(selectedConversationId);
        }
      });

      return () => {
        unsubscribe();
      };
    }
  }, [selectedConversationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async () => {
    if (!selectedConversationId) return;
    const { data } = await getMessages(selectedConversationId);
    if (data) {
      setMessages(data);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConversationId) return;

    if (isBanned && bannedUntil) {
      toast.error(`Vous êtes banni jusqu'à ${bannedUntil.toLocaleTimeString("fr-FR")}`);
      return;
    }

    setSending(true);
    const { error } = await sendMessage(selectedConversationId, newMessage.trim());

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

  const handleGroupCreated = (conversationId: string) => {
    refreshConversations();
    setSelectedConversationId(conversationId);
  };

  const handleLeaveGroup = () => {
    setSelectedConversationId(null);
    refreshConversations();
  };

  // Chat view
  if (selectedConversationId && selectedConversation) {
    const display = getConversationDisplay(selectedConversation);

    return (
      <div className="h-[calc(100vh-16rem)] flex flex-col">
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
            onClick={() => {
              setSelectedConversationId(null);
              setMessages([]);
            }}
            className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
            {display.image ? (
              <img
                src={display.image}
                alt=""
                className="w-full h-full object-cover"
              />
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
                  <div
                    key={msg.id}
                    className={`flex ${isMe ? "justify-end" : "justify-start"} group`}
                  >
                    <div className={`flex items-start gap-1 max-w-[80%] ${isMe ? "flex-row-reverse" : ""}`}>
                      <div
                        className={`px-4 py-2 rounded-2xl ${
                          isMe
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted rounded-bl-md"
                        }`}
                      >
                        {isGroup && !isMe && msg.sender?.full_name && (
                          <p className="text-xs font-semibold mb-1 text-primary">
                            {msg.sender.full_name}
                          </p>
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
                      {/* Report button - only for other users' messages */}
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
            conversationId={selectedConversationId}
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
  }

  // Conversations list
  return (
    <div>
      {/* Header with Create Group button */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-muted-foreground">
          {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
        </p>
        <Button
          variant="gameswap"
          size="sm"
          onClick={() => setCreateGroupOpen(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Groupe
        </Button>
      </div>

      {/* Conversations */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card rounded-2xl border border-border p-4 animate-pulse"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-muted" />
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
            <MessageCircle className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Aucune conversation</h3>
          <p className="text-muted-foreground mb-4">
            Contactez un vendeur ou créez un groupe
          </p>
          <Button variant="gameswap" onClick={() => setCreateGroupOpen(true)}>
            <Users className="h-4 w-4 mr-2" />
            Créer un groupe
          </Button>
        </div>
      ) : (
        <div className="space-y-2 animate-fade-in">
          {conversations.map((conversation) => {
            const display = getConversationDisplay(conversation);

            return (
              <button
                key={conversation.id}
                onClick={() => setSelectedConversationId(conversation.id)}
                className="w-full bg-card rounded-2xl border border-border p-4 flex items-center gap-4 hover:border-primary/50 transition-all text-left"
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                    {display.image ? (
                      <img
                        src={display.image}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : conversation.is_group ? (
                      <Users className="h-5 w-5 text-primary" />
                    ) : (
                      <span className="font-bold text-primary">{display.initials}</span>
                    )}
                  </div>
                  {conversation.unread_count > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                      {conversation.unread_count}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{display.name}</h3>
                      {conversation.is_group && (
                        <span className="px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded">
                          Groupe
                        </span>
                      )}
                    </div>
                    {conversation.last_message && (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(
                          new Date(conversation.last_message.created_at),
                          { addSuffix: false, locale: fr }
                        )}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {conversation.last_message?.content || "Nouvelle conversation"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Create Group Modal */}
      <CreateGroupModal
        open={createGroupOpen}
        onOpenChange={setCreateGroupOpen}
        onSuccess={handleGroupCreated}
      />
    </div>
  );
};
