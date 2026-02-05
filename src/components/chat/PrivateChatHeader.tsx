import { ArrowLeft } from "lucide-react";
import { OnlineStatusDot } from "./OnlineStatusDot";

interface PrivateChatHeaderProps {
  name: string;
  avatarUrl: string | null;
  initials: string;
  isOnline: boolean;
  onBack: () => void;
  onProfileClick: () => void;
}

export const PrivateChatHeader = ({
  name,
  avatarUrl,
  initials,
  isOnline,
  onBack,
  onProfileClick,
}: PrivateChatHeaderProps) => {
  return (
    <header className="flex items-center gap-3 px-3 py-3 bg-background/95 backdrop-blur-sm border-b border-border/50">
      {/* Back button */}
      <button
        onClick={onBack}
        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-muted/60 transition-colors"
        aria-label="Go back"
      >
        <ArrowLeft className="h-5 w-5 text-foreground" />
      </button>
      
      {/* Clickable area: Avatar + Name */}
      <div 
        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
        onClick={onProfileClick}
      >
        {/* Avatar with online indicator */}
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden ring-2 ring-background">
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt={name} 
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-bold text-primary text-base">{initials}</span>
            )}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5">
            <OnlineStatusDot isOnline={isOnline} size="sm" />
          </div>
        </div>
        
        {/* Name only - minimal */}
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-foreground truncate text-base">
            {name}
          </h1>
        </div>
      </div>
      
      {/* No buttons on the right - intentionally empty */}
    </header>
  );
};
