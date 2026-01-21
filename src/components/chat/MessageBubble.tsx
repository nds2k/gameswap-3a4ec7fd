import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, CheckCheck, Flag } from "lucide-react";
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
  readAt,
  showAvatar,
  showTimestamp,
  onReport,
  senderId,
}: MessageBubbleProps) => {
  const { language } = useLanguage();
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, "HH:mm", { locale: fr });
    } else if (isYesterday(date)) {
      return `${language === 'fr' ? 'Hier' : 'Yesterday'} ${format(date, "HH:mm", { locale: fr })}`;
    }
    return format(date, "dd/MM HH:mm", { locale: fr });
  };

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"} group`}>
      <div className={`flex items-end gap-2 max-w-[80%] ${isMe ? "flex-row-reverse" : ""}`}>
        {/* Avatar */}
        {!isMe && showAvatar && (
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0 mb-0.5">
            {sender?.avatar_url ? (
              <img src={sender.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-primary">
                {(sender?.full_name || "?").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        )}
        
        {/* Spacer when no avatar */}
        {!isMe && !showAvatar && <div className="w-8 flex-shrink-0" />}
        
        {/* Message content */}
        <div className="flex flex-col">
          {/* Sender name for groups */}
          {isGroup && !isMe && showAvatar && sender?.full_name && (
            <span className="text-xs font-semibold text-primary ml-1 mb-0.5">
              {sender.full_name}
            </span>
          )}
          
          <div
            className={`relative px-4 py-2.5 ${
              isMe
                ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                : "bg-muted rounded-2xl rounded-bl-md"
            }`}
          >
            <p className="whitespace-pre-wrap break-words text-[15px]">{content}</p>
            
            {/* Time and read status */}
            {showTimestamp && (
              <div className={`flex items-center gap-1 mt-1 ${isMe ? "justify-end" : ""}`}>
                <span
                  className={`text-[10px] ${
                    isMe ? "text-primary-foreground/60" : "text-muted-foreground"
                  }`}
                >
                  {formatTime(timestamp)}
                </span>
                
                {/* Read receipts for my messages */}
                {isMe && (
                  <span className="text-primary-foreground/60">
                    {readAt ? (
                      <CheckCheck className="h-3.5 w-3.5" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Report button */}
        {!isMe && onReport && (
          <button
            onClick={() => onReport(id, senderId)}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all self-center"
            title={language === 'fr' ? "Signaler ce message" : "Report this message"}
          >
            <Flag className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
