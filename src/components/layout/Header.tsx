import { useState } from "react";
import { Plus, Bell, LogIn, Map, MessageSquareText, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  const { checkStatus } = useSellerStatus();

  const handlePublishClick = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    try {
      const status = await checkStatus();
      if (status.hasAccount && status.onboardingComplete && status.chargesEnabled) {
        setPostModalOpen(true);
      } else {
        window.location.href = "https://gameswapp.com/become-seller";
      }
    } catch {
      setPostModalOpen(true);
    }
  };

  const handleProtectedNav = (path: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    navigate(path);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container flex items-center justify-between h-14 px-3">
          {/* Left: Logo + Brand */}
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => navigate("/")} className="shrink-0">
              <img src={logo} alt="GameSwap" className="h-8 w-8 rounded-xl" />
            </button>
            <span className="text-base font-extrabold tracking-wide text-foreground">
              GAME<span className="text-primary">SWAPP</span>
            </span>
          </div>

          {/* Center: Utility icons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate("/search")}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
              aria-label="Rechercher"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </button>
            <button
              onClick={() => handleProtectedNav("/map")}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
              aria-label="Carte"
            >
              <Map className="h-[18px] w-[18px]" />
            </button>
            <button
              onClick={() => handleProtectedNav("/forum")}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
              aria-label="Forum"
            >
              <MessageSquareText className="h-[18px] w-[18px]" />
            </button>
            <button
              onClick={() => handleProtectedNav("/profile/xp-rewards")}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
              aria-label="Récompenses"
            >
              <Trophy className="h-[18px] w-[18px]" />
            </button>
            <button
              onClick={() => {
                if (!user) { navigate("/auth"); return; }
                setNotificationsOpen(true);
              }}
              className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
              aria-label="Notifications"
            >
              <Bell className="h-[18px] w-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Right: Publish + Login */}
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="gameswap" size="sm" onClick={handlePublishClick} className="h-8 w-8 p-0 rounded-full">
              <Plus className="h-4 w-4" />
            </Button>

            {!user && (
              <Button variant="outline" size="sm" onClick={() => navigate("/auth")} className="h-8 gap-1 text-xs px-2 ml-1">
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
