import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Loader2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";

// Global chat conversation ID (fixed UUID)
const GLOBAL_CHAT_ID = "00000000-0000-0000-0000-000000000001";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender?: {
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
}

const GlobalChat = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch messages from database
  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("messages")
      .select("id, content, sender_id, created_at")
      .eq("conversation_id", GLOBAL_CHAT_ID)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return;
    }

    if (data && data.length > 0) {
      // Fetch sender profiles
      const senderIds = [...new Set(data.map((m) => m.sender_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, username")
        .in("user_id", senderIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, p])
      );

      const messagesWithSenders = data.map((msg) => ({
        ...msg,
        sender: profileMap.get(msg.sender_id) || null,
      }));

      setMessages(messagesWithSenders);
    } else {
      setMessages([]);
    }
    setLoading(false);
  };

  // Initial load
  useEffect(() => {
    fetchMessages();
  }, []);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("global-chat")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${GLOBAL_CHAT_ID}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;

          // Fetch sender profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url, username")
            .eq("user_id", newMsg.sender_id)
            .single();

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, { ...newMsg, sender: profile || null }];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message to database
  const handleSend = async () => {
    if (!newMessage.trim() || !user || sending) return;

    setSending(true);
    const { error } = await supabase.from("messages").insert({
      conversation_id: GLOBAL_CHAT_ID,
      sender_id: user.id,
      content: newMessage.trim(),
      message_type: "text",
    });

    if (error) {
      console.error("Error sending message:", error);
    } else {
      setNewMessage("");
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
        <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center">
          <MessageCircle className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-foreground">
            {language === "fr" ? "Chat Global" : "Global Chat"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {messages.length} {language === "fr" ? "messages" : "messages"}
          </p>
        </div>
      </header>

      {/* Messages List - FROM DATABASE */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              {language === "fr"
                ? "Aucun message. Soyez le premier !"
                : "No messages yet. Be the first!"}
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={msg.sender?.avatar_url || undefined} />
                  <AvatarFallback>
                    {(msg.sender?.full_name || msg.sender?.username || "?")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`max-w-[75%] ${
                    isMe ? "items-end" : "items-start"
                  }`}
                >
                  {!isMe && (
                    <p className="text-xs text-muted-foreground mb-1 px-1">
                      {msg.sender?.full_name || msg.sender?.username || "User"}
                    </p>
                  )}
                  <div
                    className={`px-4 py-2 rounded-2xl ${
                      isMe
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-muted text-foreground rounded-tl-sm"
                    }`}
                  >
                    <p className="text-[15px] break-words">{msg.content}</p>
                  </div>
                  <p
                    className={`text-[10px] text-muted-foreground mt-1 px-1 ${
                      isMe ? "text-right" : ""
                    }`}
                  >
                    {format(new Date(msg.created_at), "HH:mm", {
                      locale: language === "fr" ? fr : enUS,
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - SENDS TO DATABASE */}
      <div className="border-t border-border bg-background p-3">
        <div className="flex items-center gap-3">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              language === "fr" ? "Écrire un message..." : "Write a message..."
            }
            disabled={sending}
            className="flex-1 rounded-full bg-muted border-0"
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            size="icon"
            className="rounded-full h-10 w-10"
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GlobalChat;
