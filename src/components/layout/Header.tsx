import { useState } from "react";
import { Plus, Bell, LogIn, UserCircle, Library, Trophy, Map, Settings, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/gameswap-logo.png";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { PostGameModal } from "@/components/games/PostGameModal";
import { NotificationsSidebar } from "@/components/notifications/NotificationsSidebar";
import { useNotifications } from "@/hooks/useNotifications";
import { useSellerStatus } from "@/hooks/useSellerStatus";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Header = () => {
  const { user, signOut } = useAuth();
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

  return (
    <>
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container flex items-center gap-2 h-14 px-3">
          {/* Logo */}
          <button onClick={() => navigate("/")} className="shrink-0">
            <img src={logo} alt="GameSwap" className="h-8 w-8 rounded-xl" />
          </button>

          {/* Search bar */}
          <div
            className="flex-1 relative cursor-pointer min-w-0"
            onClick={() => navigate("/search")}
          >
            <div className="w-full h-9 rounded-full bg-muted/50 border border-border/50 px-4 flex items-center text-[12px] text-muted-foreground truncate">
              🔍 Rechercher un jeu...
            </div>
          </div>

          {/* Right action group */}
          <div className="flex items-center gap-0.5 shrink-0">
            {/* Publish */}
            <Button variant="gameswap" size="sm" onClick={handlePublishClick} className="h-8 w-8 p-0 rounded-full">
              <Plus className="h-4 w-4" />
            </Button>

            {user && (
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
            )}

            {/* Profile dropdown or Login */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground">
                    <UserCircle className="h-5 w-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-lg">
                  <DropdownMenuItem onClick={() => navigate("/profile")} className="gap-2 cursor-pointer">
                    <User className="h-4 w-4" />
                    Mon Profil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/my-games")} className="gap-2 cursor-pointer">
                    <Library className="h-4 w-4" />
                    Ma Collection
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/profile-analytics")} className="gap-2 cursor-pointer">
                    <Trophy className="h-4 w-4" />
                    Récompenses & Stats
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/map")} className="gap-2 cursor-pointer">
                    <Map className="h-4 w-4" />
                    Carte NearBuy
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/settings")} className="gap-2 cursor-pointer">
                    <Settings className="h-4 w-4" />
                    Paramètres
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
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
