import { useState } from "react";
import { Plus, Bell, Map, MessageCircle, Trophy, Search, ScanLine, SlidersHorizontal, ChevronDown } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import logo from "@/assets/gameswap-logo.png";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { PostGameModal } from "@/components/games/PostGameModal";
import { NotificationsSidebar } from "@/components/notifications/NotificationsSidebar";
import { useNotifications } from "@/hooks/useNotifications";
import { useSellerStatus } from "@/hooks/useSellerStatus";

export const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { unreadCount } = useNotifications();
  const { isFullyOnboarded } = useSellerStatus();

  const handlePublishClick = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!isSeller) {
      window.location.href = "https://gameswapp.com/become-seller";
      return;
    }
    setPostModalOpen(true);
  };

  return (
    <>
      {/* Orange status strip */}
      <div className="h-1 bg-[hsl(24,100%,50%)]" />

      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/40">
        {/* Utility row */}
        <div className="flex items-center justify-between h-12 px-3">
          {/* Logo */}
          <Link to="/" className="shrink-0">
            <img src={logo} alt="GameSwap" className="h-9 w-9 rounded-xl" />
          </Link>

          {/* Center icons */}
          <div className="flex items-center gap-1">
            <button onClick={() => navigate("/search")} className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
              <Search className="h-4 w-4" />
            </button>
            {user && (
              <>
                <button onClick={() => navigate("/map")} className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
                  <Map className="h-4 w-4" />
                </button>
                <button onClick={() => navigate("/friends")} className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
                  <MessageCircle className="h-4 w-4" />
                </button>
                <button onClick={() => navigate("/profile-analytics")} className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
                  <Trophy className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setNotificationsOpen(true)}
                  className="relative w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
              </>
            )}
          </div>

          {/* Publish button */}
          <Button
            onClick={handlePublishClick}
            className="h-9 w-9 p-0 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
          >
            <Plus className="h-4.5 w-4.5" />
          </Button>
        </div>

        {/* Search bar */}
        <div className="px-3 pb-2">
          <div
            className="relative cursor-pointer"
            onClick={() => navigate("/search")}
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <div className="w-full h-11 rounded-full bg-muted/60 border border-border/60 pl-10 pr-12 flex items-center text-sm text-muted-foreground">
              Rechercher un jeu...
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); navigate("/scanner"); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
            >
              <ScanLine className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter pill */}
        <div className="px-3 pb-2.5">
          <button
            onClick={() => navigate("/search")}
            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full border border-border bg-card text-xs font-semibold text-foreground hover:border-primary/40 transition-colors"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtres
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      </header>

      <PostGameModal open={postModalOpen} onOpenChange={setPostModalOpen} onSuccess={() => {}} />
      <NotificationsSidebar open={notificationsOpen} onOpenChange={setNotificationsOpen} />
    </>
  );
};
