import { MessageCircle, Send, ArrowLeft } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMessages } from "@/hooks/useMessages";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

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

const Messages = () => {
  const { user } = useAuth();
  const {
    conversations,
    loading,
    sendMessage,
    getMessages,
    markAsRead,
    subscribeToMessages,
    unsubscribe,
  } = useMessages();

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);
  const otherParticipant = selectedConversation?.participants.find(
    (p) => p.user_id !== user?.id
  );

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

    setSending(true);
    const { error } = await sendMessage(selectedConversationId, newMessage.trim());

    if (!error) {
      setNewMessage("");
      // Message will be added via real-time subscription
    }
    setSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Chat view
  if (selectedConversationId && selectedConversation) {
    return (
      <MainLayout showSearch={false}>
        <div className="container py-4 max-w-2xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
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
              {otherParticipant?.profile?.avatar_url ? (
                <img
                  src={otherParticipant.profile.avatar_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-bold text-primary">
                  {otherParticipant?.profile?.full_name?.[0]?.toUpperCase() || "?"}
                </span>
              )}
            </div>
            <div>
              <h2 className="font-bold">{otherParticipant?.profile?.full_name || "Utilisateur"}</h2>
              <p className="text-sm text-muted-foreground">En ligne</p>
            </div>
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
                      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                          isMe
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted rounded-bl-md"
                        }`}
                      >
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
              placeholder="Écrivez un message..."
              className="flex-1 bg-muted rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30"
              disabled={sending}
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Conversations list
  return (
    <MainLayout showSearch={false}>
      <div className="container py-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <MessageCircle className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Messages</h1>
            <p className="text-muted-foreground">
              {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
            </p>
          </div>
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
            <p className="text-muted-foreground">
              Contactez un vendeur pour démarrer une conversation
            </p>
          </div>
        ) : (
          <div className="space-y-2 animate-fade-in">
            {conversations.map((conversation) => {
              const other = conversation.participants.find(
                (p) => p.user_id !== user?.id
              );

              return (
                <button
                  key={conversation.id}
                  onClick={() => setSelectedConversationId(conversation.id)}
                  className="w-full bg-card rounded-2xl border border-border p-4 flex items-center gap-4 hover:border-primary/50 transition-all text-left"
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                      {other?.profile?.avatar_url ? (
                        <img
                          src={other.profile.avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="font-bold text-primary">
                          {other?.profile?.full_name?.[0]?.toUpperCase() || "?"}
                        </span>
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
                      <h3 className="font-semibold">
                        {other?.profile?.full_name || "Utilisateur"}
                      </h3>
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
      </div>
    </MainLayout>
  );
};

export default Messages;
