import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { PrivateRoomMessageBubble } from "./PrivateRoomMessageBubble";
import { PrivateRoomChatInput } from "./PrivateRoomChatInput";
import { Hash, Users, Shield } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";

type Message = {
  id: string;
  text: string;
  sender: string;
  senderId: string;
  timestamp: string;
};

export const PrivateRoomChat = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const channelRef = useRef<RealtimeChannel | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Fetch display name
  useEffect(() => {
    if (!user) return;
    const fetchName = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, username")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setDisplayName(data.full_name || data.username || "Anonymous");
      }
    };
    fetchName();
  }, [user]);

  const joinRoom = useCallback(() => {
    if (!roomId.trim() || !user) return;

    const channelName = `private-room:${roomId.trim().toLowerCase()}`;

    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    // Listen for messages
    channel.on("broadcast", { event: "message" }, ({ payload }) => {
      setMessages((prev) => [...prev, payload as Message]);
    });

    // Track presence for online count
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const count = Object.keys(state).reduce(
        (acc, key) => acc + (state[key] as any[]).length,
        0
      );
      setOnlineCount(count);
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          user_id: user.id,
          name: displayName || "Anonymous",
          online_at: new Date().toISOString(),
        });
        setJoined(true);
      }
    });

    channelRef.current = channel;
  }, [roomId, user, displayName]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  const sendMessage = useCallback(
    (text: string) => {
      if (!channelRef.current || !user) return;

      const msg: Message = {
        id: crypto.randomUUID(),
        text,
        sender: displayName || "Anonymous",
        senderId: user.id,
        timestamp: new Date().toISOString(),
      };

      // Add to local state immediately (sender sees it instantly)
      setMessages((prev) => [...prev, msg]);

      // Broadcast to others (self: false means we won't receive our own)
      channelRef.current.send({
        type: "broadcast",
        event: "message",
        payload: msg,
      });
    },
    [user, displayName]
  );

  const leaveRoom = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setJoined(false);
    setMessages([]);
    setOnlineCount(0);
  }, []);

  // --- JOIN SCREEN ---
  if (!joined) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Hash className="h-8 w-8 text-primary" />
        </div>

        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground">
            {language === "fr" ? "Salon privé" : "Private Room"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            {language === "fr"
              ? "Entrez un identifiant de salon. Seuls ceux avec le même ID peuvent discuter."
              : "Enter a room ID. Only people with the same ID can chat."}
          </p>
        </div>

        <div className="w-full max-w-xs flex flex-col gap-3">
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && joinRoom()}
            placeholder={language === "fr" ? "Identifiant du salon..." : "Room ID..."}
            className="w-full bg-muted rounded-full px-5 py-3 text-center text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
          />
          <button
            onClick={joinRoom}
            disabled={!roomId.trim()}
            className="w-full py-3 rounded-full bg-primary text-primary-foreground font-semibold text-[15px] hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {language === "fr" ? "Rejoindre le salon" : "Join Room"}
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
          <Shield className="h-3.5 w-3.5" />
          <span>
            {language === "fr"
              ? "Les messages sont éphémères et ne sont pas stockés"
              : "Messages are ephemeral and not stored"}
          </span>
        </div>
      </div>
    );
  }

  // --- CHAT SCREEN ---
  return (
    <div className="flex flex-col h-full">
      {/* Room info bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 text-sm">
          <Hash className="h-4 w-4 text-primary" />
          <span className="font-semibold text-foreground">{roomId}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>{onlineCount} {language === "fr" ? "en ligne" : "online"}</span>
          </div>
          <button
            onClick={leaveRoom}
            className="text-xs text-destructive hover:text-destructive/80 font-medium transition-colors"
          >
            {language === "fr" ? "Quitter" : "Leave"}
          </button>
        </div>
      </div>

      {/* Messages */}
      {messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <p className="text-sm text-muted-foreground text-center">
            {language === "fr"
              ? "Aucun message. Dites quelque chose ! 👋"
              : "No messages yet. Say something! 👋"}
          </p>
        </div>
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
          {messages.map((msg) => (
            <PrivateRoomMessageBubble
              key={msg.id}
              message={msg}
              isMe={msg.senderId === user?.id}
            />
          ))}
        </div>
      )}

      {/* Input */}
      <PrivateRoomChatInput onSend={sendMessage} />
    </div>
  );
};
