import { useState, useRef } from "react";
import { Send, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface AIChatInputProps {
  onSend: (text: string) => void;
  loading: boolean;
}

export const AIChatInput = ({ onSend, loading }: AIChatInputProps) => {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { language } = useLanguage();

  const handleSend = () => {
    if (!input.trim() || loading) return;
    onSend(input.trim());
    setInput("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const placeholder =
    language === "fr"
      ? "Posez votre question..."
      : "Ask anything...";

  return (
    <div className="border-t border-border bg-background p-3">
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={loading}
          className="flex-1 bg-muted rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 text-[15px] placeholder:text-muted-foreground"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
            input.trim() && !loading
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
};
