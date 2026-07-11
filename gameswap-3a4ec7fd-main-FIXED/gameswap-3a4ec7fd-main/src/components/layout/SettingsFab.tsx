import { useState } from "react";
import { Map, Settings, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationsSidebar } from "@/components/notifications/NotificationsSidebar";
import { useNotifications } from "@/hooks/useNotifications";
import { useLanguage } from "@/contexts/LanguageContext";

export const SettingsFab = () => {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { unreadCount } = useNotifications();
  const { t } = useLanguage();

  return (
    <>
      <div className="fixed right-3 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2">
        {/* Map button */}
        <Link
          to="/map"
          className="w-11 h-11 rounded-full bg-card shadow-lg border border-border flex items-center justify-center transition-all duration-200 hover:shadow-xl hover:scale-105 active:scale-95"
        >
          <Map className="h-5 w-5 text-muted-foreground" />
        </Link>

        {/* Notifications */}
        <button 
          onClick={() => setNotificationsOpen(true)}
          className="relative w-11 h-11 rounded-full bg-card shadow-lg border border-border flex items-center justify-center transition-all duration-200 hover:shadow-xl hover:scale-105 active:scale-95"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* Settings dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-11 h-11 rounded-full bg-card shadow-lg border border-border flex items-center justify-center transition-all duration-200 hover:shadow-xl hover:scale-105 active:scale-95">
              <Settings className="h-5 w-5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="left" className="w-48">
            <DropdownMenuItem asChild>
              <Link to="/settings">{t("header.settings")}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/profile">{t("header.profile")}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/legal">{t("header.legal")}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/support">{t("support.title")}</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <NotificationsSidebar open={notificationsOpen} onOpenChange={setNotificationsOpen} />
    </>
  );
};
