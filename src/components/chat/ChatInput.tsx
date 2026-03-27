import { useState, useRef } from "react";
import { Send, Smile, Image as ImageIcon, X, Loader2 } from "lucide-react";
import { EmojiPicker } from "./EmojiPicker";
import { ReplyPreview } from "./ReplyPreview";
import { ImagePreview } from "./ImagePreview";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChatInputProps {
  onSend: (message: string, imageUrl?: string) => void;
  onTyping?: () => void;
  disabled?: boolean;
  disabledMessage?: string;
  sending?: boolean;
  replyTo?: {
    id: string;
    content: string;
    senderName: string;
  } | null;
  onClearReply?: () => void;
}

export const ChatInput = ({
  onSend,
  onTyping,
  disabled = false,
  disabledMessage,
  sending = false,
  replyTo,
  onClearReply,
}: ChatInputProps) => {
  const { t, language } = useLanguage();
  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(language === 'fr' ? "Image trop grande (max 5MB)" : "Image too large (max 5MB)");
        return;
      }
      setImageFile(file);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileName = `chat/${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const { data, error } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { contentType: file.type });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Upload error:", error);
      return null;
    }
  };

  const handleSend = async () => {
    if ((!message.trim() && !imageFile) || disabled || sending || uploading) return;

    setUploading(true);
    let imageUrl: string | undefined;

    if (imageFile) {
      const url = await uploadImage(imageFile);
      if (url) {
        imageUrl = url;
      } else {
        toast.error(language === 'fr' ? "Erreur d'upload" : "Upload failed");
        setUploading(false);
        return;
      }
    }

    onSend(message.trim() || "📷", imageUrl);
    setMessage("");
    setImageFile(null);
    setUploading(false);
    if (onClearReply) onClearReply();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const placeholder = disabledMessage || (language === 'fr' ? "Écrire votre message..." : "Write your message...");
  const isLoading = sending || uploading;

  return (
    <div className="border-t border-border bg-background">
      {/* Reply preview */}
      {replyTo && onClearReply && (
        <ReplyPreview replyTo={replyTo} onClear={onClearReply} />
      )}

      {/* Image preview */}
      {imageFile && (
        <ImagePreview file={imageFile} onRemove={() => setImageFile(null)} />
      )}

      <div className="flex items-center gap-3 p-3">
        {/* Image picker */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isLoading}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          <ImageIcon className="h-5 w-5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />

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
            disabled={disabled || isLoading}
            className="w-full bg-muted rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 text-[15px] placeholder:text-muted-foreground"
          />
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={(!message.trim() && !imageFile) || disabled || isLoading}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
            (message.trim() || imageFile) && !disabled && !isLoading
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
};
