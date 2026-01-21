import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";

interface MessageBubbleProps {
  id: string;
  content: string;
  timestamp: string;
  isMe: boolean;
  isGroup: boolean;
  sender?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  readAt: string | null;
  showAvatar: boolean;
  showTimestamp: boolean;
  onReport?: (messageId: string, senderId: string) => void;
  senderId: string;
}

export const MessageBubble = ({
  id,
  content,
  timestamp,
  isMe,
  isGroup,
  sender,
  showAvatar,
  showTimestamp,
  onReport,
  senderId,
}: MessageBubbleProps) => {
  const { language } = useLanguage();
  const locale = language === 'fr' ? fr : enUS;

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), "HH:mm", { locale });
  };

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-1`}>
      <div className={`flex items-end gap-2 max-w-[75%] ${isMe ? "flex-row-reverse" : ""}`}>
        {/* Avatar for received messages */}
        {!isMe && showAvatar && (
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center overflow-hidden flex-shrink-0 mb-5">
            {sender?.avatar_url ? (
              <img src={sender.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-primary-foreground">
                {(sender?.full_name || "?").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        )}
        
        {/* Spacer when no avatar shown */}
        {!isMe && !showAvatar && <div className="w-9 flex-shrink-0" />}
        
        {/* Message content with timestamp */}
        <div className="flex flex-col">
          {/* Sender name for groups */}
          {isGroup && !isMe && showAvatar && sender?.full_name && (
            <span className="text-xs font-medium text-muted-foreground ml-1 mb-1">
              {sender.full_name}
            </span>
          )}
          
          {/* Bubble */}
          <div
            className={`relative px-4 py-2.5 ${
              isMe
                ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
                : "bg-muted text-foreground rounded-2xl rounded-bl-sm"
            }`}
          >
            <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{content}</p>
          </div>
          
          {/* Timestamp below bubble */}
          {showTimestamp && (
            <span className={`text-[11px] text-muted-foreground mt-1 ${isMe ? "text-right mr-1" : "ml-1"}`}>
              {formatTime(timestamp)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
