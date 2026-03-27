import { X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ReplyPreviewProps {
  replyTo: {
    id: string;
    content: string;
    senderName: string;
  };
  onClear: () => void;
}

export const ReplyPreview = ({ replyTo, onClear }: ReplyPreviewProps) => {
  const { language } = useLanguage();

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-t border-border animate-fade-in">
      <div className="w-1 h-10 bg-primary rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-primary">
          {language === 'fr' ? 'Répondre à' : 'Replying to'} {replyTo.senderName}
        </p>
        <p className="text-sm text-muted-foreground truncate">{replyTo.content}</p>
      </div>
      <button
        onClick={onClear}
        className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
};
