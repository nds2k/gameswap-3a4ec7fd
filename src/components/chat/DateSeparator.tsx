import { format, isToday, isYesterday } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";

interface DateSeparatorProps {
  date: Date;
}

export const DateSeparator = ({ date }: DateSeparatorProps) => {
  const { language } = useLanguage();
  const locale = language === 'fr' ? fr : enUS;

  const getDateLabel = () => {
    if (isToday(date)) {
      return language === 'fr' ? "Aujourd'hui" : "Today";
    } else if (isYesterday(date)) {
      return language === 'fr' ? "Hier" : "Yesterday";
    }
    return format(date, "EEEE d MMMM", { locale });
  };

  return (
    <div className="flex items-center justify-center py-4">
      <div className="bg-muted/50 px-3 py-1 rounded-full">
        <span className="text-xs text-muted-foreground font-medium capitalize">
          {getDateLabel()}
        </span>
      </div>
    </div>
  );
};
