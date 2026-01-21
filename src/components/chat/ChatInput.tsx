import { useState, useRef, useEffect } from "react";
import { Send, Smile } from "lucide-react";
import { EmojiPicker } from "./EmojiPicker";
import { useLanguage } from "@/contexts/LanguageContext";

interface ChatInputProps {
  onSend: (message: string) => void;
  onTyping?: () => void;
  disabled?: boolean;
  disabledMessage?: string;
  sending?: boolean;
}

export const ChatInput = ({
  onSend,
  onTyping,
  disabled = false,
  disabledMessage,
  sending = false,
}: ChatInputProps) => {
  const { t, language } = useLanguage();
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTyping = () => {
    if (onTyping) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      onTyping();
      typingTimeoutRef.current = setTimeout(() => {}, 2000);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    handleTyping();
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const handleSend = () => {
    if (!message.trim() || disabled || sending) return;
    onSend(message.trim());
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const placeholder = disabledMessage || (language === 'fr' ? "Écrire votre message..." : "Write your message...");

  return (
    <div className="flex items-center gap-3 p-3 bg-background border-t border-border">
      {/* Emoji picker */}
      <EmojiPicker onEmojiSelect={handleEmojiSelect} />

      {/* Input */}
      <div className="flex-1 relative">
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-muted rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 text-[15px] placeholder:text-muted-foreground"
        />
      </div>

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={!message.trim() || disabled || sending}
        className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
          message.trim() && !disabled && !sending
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-muted text-muted-foreground"
        }`}
      >
        <Send className="h-5 w-5" />
      </button>
    </div>
  );
};
