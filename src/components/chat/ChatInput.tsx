import { useState, useRef, useEffect } from "react";
import { Send, Image, Mic } from "lucide-react";
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
  const { t } = useLanguage();
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleTyping = () => {
    if (onTyping) {
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Notify typing
      onTyping();
      
      // Stop typing indicator after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        // Typing stopped - could emit a stop typing event here
      }, 2000);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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

  return (
    <div className="flex items-end gap-2 p-3 bg-background border-t border-border">
      {/* Emoji picker */}
      <EmojiPicker onEmojiSelect={handleEmojiSelect} />

      {/* Input container */}
      <div className="flex-1 relative">
        <textarea
          ref={inputRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={disabledMessage || t("messages.placeholder")}
          disabled={disabled}
          rows={1}
          className="w-full bg-muted rounded-2xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 resize-none max-h-30 text-[15px] placeholder:text-muted-foreground"
          style={{ minHeight: "48px" }}
        />
      </div>

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={!message.trim() || disabled || sending}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
          message.trim() && !disabled && !sending
            ? "bg-primary text-primary-foreground hover:bg-primary/90 scale-100"
            : "bg-muted text-muted-foreground scale-95"
        }`}
      >
        <Send className={`h-5 w-5 transition-transform ${message.trim() ? "translate-x-0.5" : ""}`} />
      </button>
    </div>
  );
};
