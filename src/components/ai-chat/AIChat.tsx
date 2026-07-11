import { useState, useRef, useEffect } from "react";
import { AIChatMessageBubble } from "./AIChatMessageBubble";
import { AIChatInput } from "./AIChatInput";
import { Bot } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

export const AIChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    let assistantContent = "";

    const upsertAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => null);
        const errorMsg = errorData?.error || "AI service error";

        if (resp.status === 429) {
          toast.error(language === "fr" ? "Trop de requêtes. Réessayez dans un instant." : "Too many requests. Please wait a moment.");
        } else if (resp.status === 402) {
          toast.error(language === "fr" ? "Crédits AI épuisés." : "AI credits exhausted.");
        } else {
          toast.error(errorMsg);
        }

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: language === "fr" ? "⚠️ Erreur. Réessayez." : "⚠️ Error. Try again." },
        ]);
        setLoading(false);
        return;
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            /* ignore partial leftovers */
          }
        }
      }
    } catch (e) {
      console.error("[AIChat] Stream error:", e);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: language === "fr" ? "⚠️ Erreur de connexion. Réessayez." : "⚠️ Connection error. Try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const emptyState = (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
        <Bot className="h-8 w-8 text-primary" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-foreground">
          {language === "fr" ? "Assistant GameSwap" : "GameSwap Assistant"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          {language === "fr"
            ? "Posez-moi vos questions sur les jeux, les échanges, ou la plateforme !"
            : "Ask me anything about games, trading, or the platform!"}
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Messages area */}
      {messages.length === 0 ? (
        emptyState
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((msg, i) => (
            <AIChatMessageBubble key={i} message={msg} />
          ))}
          {loading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <AIChatInput onSend={sendMessage} loading={loading} />
    </div>
  );
};
