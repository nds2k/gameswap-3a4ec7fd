import { useState, useRef } from "react";
import { Send, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface PrivateRoomChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export const PrivateRoomChatInput = ({ onSend, disabled = false }: PrivateRoomChatInputProps) => {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { language } = useLanguage();

  const handleSend = () => {
    if (!input.trim() || disabled) return;
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

  const placeholder = language === "fr" ? "Message privé..." : "Private message...";

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
          disabled={disabled}
          className="flex-1 bg-muted rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 text-[15px] placeholder:text-muted-foreground"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || disabled}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
            input.trim() && !disabled
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {disabled ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
};
