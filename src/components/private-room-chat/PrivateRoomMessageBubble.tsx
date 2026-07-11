import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";
import { User } from "lucide-react";

interface PrivateRoomMessageBubbleProps {
  message: {
    id: string;
    text: string;
    sender: string;
    senderId: string;
    timestamp: string;
  };
  isMe: boolean;
}

export const PrivateRoomMessageBubble = ({ message, isMe }: PrivateRoomMessageBubbleProps) => {
  const { language } = useLanguage();
  const locale = language === "fr" ? fr : enUS;

  const time = format(new Date(message.timestamp), "HH:mm", { locale });

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-2`}>
      <div className={`flex items-end gap-2 max-w-[75%] ${isMe ? "flex-row-reverse" : ""}`}>
        {/* Avatar */}
        {!isMe && (
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-primary" />
          </div>
        )}

        <div className="flex flex-col">
          {/* Sender name for others */}
          {!isMe && (
            <span className="text-xs font-medium text-muted-foreground ml-1 mb-0.5">
              {message.sender}
            </span>
          )}

          {/* Bubble */}
          <div
            className={`px-4 py-2.5 text-[15px] leading-relaxed ${
              isMe
                ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
                : "bg-muted text-foreground rounded-2xl rounded-bl-sm"
            }`}
          >
            <p className="whitespace-pre-wrap break-words">{message.text}</p>
          </div>

          {/* Timestamp */}
          <span className={`text-[11px] text-muted-foreground mt-0.5 ${isMe ? "text-right mr-1" : "ml-1"}`}>
            {time}
          </span>
        </div>
      </div>
    </div>
  );
};
