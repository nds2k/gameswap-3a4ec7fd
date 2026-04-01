import { useState, useEffect } from "react";
import { Plus, Bell, LogIn } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import logo from "@/assets/gameswap-logo.png";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PostGameModal } from "@/components/games/PostGameModal";
import { NotificationsSidebar } from "@/components/notifications/NotificationsSidebar";
import { useNotifications } from "@/hooks/useNotifications";

export const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { unreadCount } = useNotifications();

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => { if (data) setProfile(data); });
    }
  }, [user]);

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
        <div className="container flex items-center justify-between h-14 px-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src={logo} alt="GameSwap" className="h-8 w-8 rounded-xl" />
            <span className="font-bold text-lg hidden sm:block">GameSwap</span>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            {user && (
              <button
                onClick={() => setNotificationsOpen(true)}
                className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            )}

            {/* Publish */}
            <Button variant="gameswap" size="sm" onClick={handlePublishClick} className="h-9 px-3 text-xs">
              <Plus className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Publier</span>
            </Button>

            {/* Login if not authenticated */}
            {!user && (
              <Button variant="outline" size="sm" onClick={() => navigate("/auth")} className="h-9 gap-1.5">
                <LogIn className="h-4 w-4" />
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
