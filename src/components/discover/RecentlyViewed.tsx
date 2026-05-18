import { X } from "lucide-react";
import { SearchHistoryItem } from "@/hooks/useSearchHistory";

interface RecentlyViewedProps {
  history: SearchHistoryItem[];
  onSelect: (item: SearchHistoryItem) => void;
  onClear: () => void;
}

export const RecentlyViewed = ({ history, onSelect, onClear }: RecentlyViewedProps) => {
  if (history.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Récemment vus</span>
        <button onClick={onClear} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
          <X className="h-3 w-3" /> Effacer
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x">
        {history.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className="flex-shrink-0 snap-start w-[80px] group"
          >
            <div className="w-[80px] h-[80px] rounded-xl overflow-hidden bg-muted border border-border/50 group-hover:border-primary/50 transition-colors">
              {item.image_url ? (
                <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">🎲</div>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1 text-center">{item.title}</p>
          </button>
        ))}
      </div>
    </div>
  );
};
