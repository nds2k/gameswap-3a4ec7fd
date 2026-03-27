import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";
import { Check, CheckCheck, Reply, Pencil, Trash2, MoreVertical } from "lucide-react";
import { MessageReactions } from "./MessageReactions";
import { useState, useRef } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PrivateMessageBubbleProps {
  id: string;
  content: string;
  timestamp: string;
  isMe: boolean;
  sender?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  readAt: string | null;
  showTimestamp: boolean;
  reactions?: Record<string, string[]>;
  onReact?: (messageId: string, emoji: string) => void;
  replyTo?: {
    content: string;
    senderName: string;
  } | null;
  onReply?: (messageId: string, content: string, senderName: string) => void;
  imageUrl?: string | null;
  currentUserId?: string;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
}

export const PrivateMessageBubble = ({
  id,
  content,
  timestamp,
  isMe,
  sender,
  readAt,
  showTimestamp,
  reactions = {},
  onReact,
  replyTo,
  onReply,
  imageUrl,
  currentUserId,
  onEdit,
  onDelete,
}: PrivateMessageBubbleProps) => {
  const { language } = useLanguage();
  const locale = language === 'fr' ? fr : enUS;
  const [showActions, setShowActions] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(content);
  const touchStartX = useRef(0);
  const touchStartTime = useRef(0);

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), "HH:mm", { locale });
  };

  const handleReact = (emoji: string) => {
    if (onReact) onReact(id, emoji);
  };

  const handleReply = () => {
    if (onReply) onReply(id, content, sender?.full_name || (language === 'fr' ? 'Utilisateur' : 'User'));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartTime.current = Date.now();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX.current;
    const deltaTime = Date.now() - touchStartTime.current;
    if (deltaTime < 300) {
      if (!isMe && deltaX > 50) handleReply();
      else if (isMe && deltaX < -50) handleReply();
    }
  };

  const lastTapRef = useRef(0);
  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) handleReact("❤️");
    lastTapRef.current = now;
  };

  const handleEditSubmit = () => {
    if (editText.trim() && onEdit) {
      onEdit(id, editText.trim());
    }
    setEditing(false);
  };

  const hasReactions = Object.keys(reactions).length > 0;

  return (
    <div 
      className={`flex ${isMe ? "justify-end" : "justify-start"} mb-1.5 group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { if (!menuOpen) setShowActions(false); }}
    >
      <div 
        className={`flex items-end gap-2 max-w-[80%] ${isMe ? "flex-row-reverse" : ""}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={handleDoubleTap}
      >
        {/* Reply button (hover) */}
        {showActions && onReply && !editing && (
          <button
            onClick={handleReply}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-all opacity-0 group-hover:opacity-100 mb-3 ${isMe ? 'order-first' : 'order-last'}`}
          >
            <Reply className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Actions menu for own messages */}
        {isMe && showActions && !editing && (onEdit || onDelete) && (
          <DropdownMenu open={menuOpen} onOpenChange={(open) => { setMenuOpen(open); if (!open) setShowActions(false); }}>
            <DropdownMenuTrigger asChild>
              <button className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-all opacity-0 group-hover:opacity-100 mb-3">
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover z-50">
              {onEdit && (
                <DropdownMenuItem onClick={() => { setEditing(true); setEditText(content); }}>
                  <Pencil className="h-3.5 w-3.5 mr-2" />
                  {language === 'fr' ? 'Modifier' : 'Edit'}
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem onClick={() => onDelete(id)} className="text-destructive focus:text-destructive">
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  {language === 'fr' ? 'Retirer l\'envoi' : 'Unsend'}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        
        <div className="flex flex-col relative">
          {/* Reply preview */}
          {replyTo && (
            <div className={`text-xs px-3 py-1.5 mb-0.5 rounded-t-2xl border-l-2 ${
              isMe ? 'bg-primary/20 border-primary/50' : 'bg-muted/80 border-muted-foreground/30'
            }`}>
              <span className="font-medium text-xs opacity-80">{replyTo.senderName}</span>
              <p className="truncate opacity-70 text-xs">{replyTo.content}</p>
            </div>
          )}
          
          {/* Message Bubble */}
          <div
            className={`relative px-4 py-2.5 ${
              isMe
                ? "bg-primary text-primary-foreground rounded-[1.25rem] rounded-br-md"
                : "bg-card border border-border/60 text-foreground rounded-[1.25rem] rounded-bl-md"
            } ${replyTo ? 'rounded-t-none' : ''} shadow-sm`}
          >
            {imageUrl && (
              <div className="mb-2 -mx-1 -mt-0.5">
                <img src={imageUrl} alt="Shared" className="rounded-xl max-w-full max-h-60 object-cover" />
              </div>
            )}
            
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleEditSubmit(); if (e.key === 'Escape') setEditing(false); }}
                  className="flex-1 bg-transparent border-b border-primary-foreground/30 outline-none text-[15px]"
                  autoFocus
                />
                <button onClick={handleEditSubmit} className="text-xs font-semibold opacity-80 hover:opacity-100">✓</button>
                <button onClick={() => setEditing(false)} className="text-xs opacity-60 hover:opacity-100">✕</button>
              </div>
            ) : (
              <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{content}</p>
            )}
          </div>

          {/* Reactions */}
          {(hasReactions || showActions) && currentUserId && (
            <div className={`mt-0.5 ${isMe ? 'self-end' : 'self-start'}`}>
              <MessageReactions reactions={reactions} onReact={handleReact} currentUserId={currentUserId} />
            </div>
          )}
          
          {/* Timestamp + Read receipt */}
          {showTimestamp && (
            <div className={`flex items-center gap-1 mt-1 ${isMe ? "justify-end pr-1" : "pl-1"}`}>
              <span className="text-[11px] text-muted-foreground">{formatTime(timestamp)}</span>
              {isMe && (
                <span className="text-muted-foreground">
                  {readAt ? <CheckCheck className="h-3.5 w-3.5 text-primary" /> : <Check className="h-3.5 w-3.5" />}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
