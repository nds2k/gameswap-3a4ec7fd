import { useState, useEffect } from "react";
import { Plus, Bell, LogIn, Map, MessageCircle, Trophy, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import logo from "@/assets/gameswap-logo.png";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PostGameModal } from "@/components/games/PostGameModal";
import { NotificationsSidebar } from "@/components/notifications/NotificationsSidebar";
import { useNotifications } from "@/hooks/useNotifications";
import { Input } from "@/components/ui/input";

export const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { unreadCount } = useNotifications();

  const handlePublishClick = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setPostModalOpen(true);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container flex items-center gap-2 h-14 px-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-1.5 shrink-0">
            <img src={logo} alt="GameSwap" className="h-8 w-8 rounded-xl" />
          </Link>

          {/* Search bar */}
          <div
            className="flex-1 relative cursor-pointer min-w-0"
            onClick={() => navigate("/search")}
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <div className="w-full h-9 rounded-xl bg-muted/50 border border-border/50 pl-9 pr-3 flex items-center text-xs text-muted-foreground truncate">
              Rechercher un jeu...
            </div>
          </div>

          {/* Action icons */}
          <div className="flex items-center gap-0.5 shrink-0">
            {user && (
              <>
                <button onClick={() => navigate("/map")} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground">
                  <Map className="h-4 w-4" />
                </button>
                <button onClick={() => navigate("/friends")} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground">
                  <MessageCircle className="h-4 w-4" />
                </button>
                <button onClick={() => navigate("/profile-analytics")} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground">
                  <Trophy className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setNotificationsOpen(true)}
                  className="relative w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
              </>
            )}

            {/* Publish */}
            <Button variant="gameswap" size="sm" onClick={handlePublishClick} className="h-8 w-8 p-0 rounded-full">
              <Plus className="h-4 w-4" />
            </Button>

            {/* Login if not authenticated */}
            {!user && (
              <Button variant="outline" size="sm" onClick={() => navigate("/auth")} className="h-8 gap-1 text-xs px-2">
                <LogIn className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Connexion</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <PostGameModal open={postModalOpen} onOpenChange={setPostModalOpen} onSuccess={() => {}} />
      <NotificationsSidebar open={notificationsOpen} onOpenChange={setNotificationsOpen} />
    </>
  );
};
