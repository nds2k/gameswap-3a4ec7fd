import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "😠", "👍"];

interface MessageReactionsProps {
  reactions: Record<string, string[]>;
  onReact: (emoji: string) => void;
  currentUserId: string;
}

export const MessageReactions = ({ reactions, onReact, currentUserId }: MessageReactionsProps) => {
  const [open, setOpen] = useState(false);

  const handleReact = (emoji: string) => {
    onReact(emoji);
    setOpen(false);
  };

  // Get all reactions as badges
  const reactionBadges = Object.entries(reactions || {}).map(([emoji, userIds]) => ({
    emoji,
    count: userIds.length,
    hasReacted: userIds.includes(currentUserId),
  })).filter(r => r.count > 0);

  return (
    <div className="flex items-center gap-1">
      {/* Display existing reactions */}
      {reactionBadges.map(({ emoji, count, hasReacted }) => (
        <button
          key={emoji}
          onClick={() => handleReact(emoji)}
          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-all ${
            hasReacted
              ? "bg-primary/20 border border-primary/30"
              : "bg-muted hover:bg-muted/80"
          }`}
        >
          <span>{emoji}</span>
          {count > 1 && <span className="text-muted-foreground">{count}</span>}
        </button>
      ))}

      {/* Add reaction button */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100">
            <span className="text-sm">+</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-1" side="top" align="center">
          <div className="flex gap-1">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className="w-8 h-8 flex items-center justify-center text-lg rounded-full hover:bg-muted transition-colors hover:scale-125"
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
