import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";
import { Check, CheckCheck, Reply } from "lucide-react";
import { MessageReactions } from "./MessageReactions";
import { useState, useRef } from "react";

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
  reactions?: Record<string, string[]>;
  onReact?: (messageId: string, emoji: string) => void;
  replyTo?: {
    content: string;
    senderName: string;
  } | null;
  onReply?: (messageId: string, content: string, senderName: string) => void;
  imageUrl?: string | null;
  currentUserId?: string;
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
  reactions = {},
  onReact,
  replyTo,
  onReply,
  imageUrl,
  currentUserId,
}: MessageBubbleProps) => {
  const { language } = useLanguage();
  const locale = language === 'fr' ? fr : enUS;
  const [showActions, setShowActions] = useState(false);
  const touchStartX = useRef(0);
  const touchStartTime = useRef(0);

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), "HH:mm", { locale });
  };

  const handleReact = (emoji: string) => {
    if (onReact) {
      onReact(id, emoji);
    }
  };

  const handleReply = () => {
    if (onReply) {
      onReply(id, content, sender?.full_name || (language === 'fr' ? 'Utilisateur' : 'User'));
    }
  };

  // Swipe to reply handler
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartTime.current = Date.now();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX.current;
    const deltaTime = Date.now() - touchStartTime.current;
    
    // Quick swipe right (for received messages) or left (for sent messages)
    if (deltaTime < 300) {
      if (!isMe && deltaX > 50) {
        handleReply();
      } else if (isMe && deltaX < -50) {
        handleReply();
      }
    }
  };

  // Double tap for reaction
  const lastTapRef = useRef(0);
  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      handleReact("❤️");
    }
    lastTapRef.current = now;
  };

  const hasReactions = Object.keys(reactions).length > 0;

  return (
    <div 
      className={`flex ${isMe ? "justify-end" : "justify-start"} mb-1 group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div 
        className={`flex items-end gap-2 max-w-[75%] ${isMe ? "flex-row-reverse" : ""}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={handleDoubleTap}
      >
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

        {/* Reply button (appears on hover for sent messages) */}
        {isMe && showActions && onReply && (
          <button
            onClick={handleReply}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-all opacity-0 group-hover:opacity-100 mb-4"
          >
            <Reply className="h-4 w-4" />
          </button>
        )}
        
        {/* Message content with timestamp */}
        <div className="flex flex-col relative">
          {/* Sender name for groups */}
          {isGroup && !isMe && showAvatar && sender?.full_name && (
            <span className="text-xs font-medium text-muted-foreground ml-1 mb-1">
              {sender.full_name}
            </span>
          )}

          {/* Reply preview */}
          {replyTo && (
            <div className={`text-xs px-3 py-1.5 mb-0.5 rounded-t-xl ${isMe ? 'bg-primary/60' : 'bg-muted/60'}`}>
              <span className="font-medium">{replyTo.senderName}</span>
              <p className="truncate opacity-80">{replyTo.content}</p>
            </div>
          )}
          
          {/* Bubble */}
          <div
            className={`relative px-4 py-2.5 ${
              isMe
                ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
                : "bg-muted text-foreground rounded-2xl rounded-bl-sm"
            } ${replyTo ? 'rounded-t-none' : ''}`}
          >
            {/* Image content */}
            {imageUrl && (
              <div className="mb-2 -mx-2 -mt-1">
                <img 
                  src={imageUrl} 
                  alt="Shared image" 
                  className="rounded-xl max-w-full max-h-64 object-cover"
                />
              </div>
            )}
            
            <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{content}</p>
            
            {/* Inline read receipt for sent messages */}
            {isMe && (
              <span className="inline-flex items-center ml-1 opacity-70">
                {readAt ? (
                  <CheckCheck className="h-3.5 w-3.5 text-blue-400" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
              </span>
            )}
          </div>

          {/* Reactions display */}
          {(hasReactions || showActions) && currentUserId && (
            <div className={`mt-0.5 ${isMe ? 'self-end' : 'self-start'}`}>
              <MessageReactions
                reactions={reactions}
                onReact={handleReact}
                currentUserId={currentUserId}
              />
            </div>
          )}
          
          {/* Timestamp below bubble */}
          {showTimestamp && (
            <span className={`text-[11px] text-muted-foreground mt-1 ${isMe ? "text-right mr-1" : "ml-1"}`}>
              {formatTime(timestamp)}
            </span>
          )}
        </div>

        {/* Reply button (appears on hover for received messages) */}
        {!isMe && showActions && onReply && (
          <button
            onClick={handleReply}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-all opacity-0 group-hover:opacity-100 mb-4"
          >
            <Reply className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};
