import { useState, useEffect } from "react";
import { Plus, Bell, LogIn, User as UserIcon, Settings, CreditCard, Map, MessageSquare, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/gameswap-logo.png";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PostGameModal } from "@/components/games/PostGameModal";
import { NotificationsSidebar } from "@/components/notifications/NotificationsSidebar";
import { useNotifications } from "@/hooks/useNotifications";
import { useSellerStatus } from "@/hooks/useSellerStatus";

export const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { unreadCount } = useNotifications();
  const { checkStatus } = useSellerStatus();

  useEffect(() => {
    if (!user) {
      setAvatarUrl(null);
      return;
    }
    supabase
      .from("profiles")
      .select("avatar_url")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setAvatarUrl(data?.avatar_url ?? null));
  }, [user]);

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

  const initials = (user?.email ?? "U").slice(0, 1).toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container flex items-center justify-between h-14 px-3">
          {/* Left: Logo + Brand */}
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => navigate("/")} className="shrink-0" aria-label="Accueil">
              <img src={logo} alt="GameSwap" className="h-8 w-8 rounded-xl" />
            </button>
            <span className="text-base font-extrabold tracking-wide text-foreground">
              GAME<span className="text-primary">SWAPP</span>
            </span>
          </div>

          {/* Right: Notifications + Publish + Profile/Login */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => navigate("/map")}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
              aria-label="Carte"
            >
              <Map className="h-[18px] w-[18px]" />
            </button>
            <button
              onClick={() => navigate("/forum")}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
              aria-label="Forum"
            >
              <MessageSquare className="h-[18px] w-[18px]" />
            </button>
            <button
              onClick={() => {
                if (!user) { navigate("/auth"); return; }
                navigate("/xp-rewards");
              }}
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

            <Button
              variant="gameswap"
              size="sm"
              onClick={handlePublishClick}
              className="h-8 w-8 p-0 rounded-full"
              aria-label="Publier un jeu"
            >
              <Plus className="h-4 w-4" />
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="ml-1 rounded-full ring-2 ring-transparent hover:ring-primary/40 transition"
                    aria-label="Menu profil"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={avatarUrl ?? undefined} alt="Profil" />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={8}
                  className="w-56 rounded-xl shadow-lg"
                >
                  <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer">
                    <UserIcon className="mr-2 h-4 w-4" />
                    Mon profil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Paramètres
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/payment-requests")} className="cursor-pointer">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Demandes de paiement
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      const { error } = await supabase.auth.signOut();
                      if (!error) navigate("/auth");
                    }}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    Se déconnecter
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
