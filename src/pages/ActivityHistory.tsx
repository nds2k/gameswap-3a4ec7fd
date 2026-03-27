import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Loader2, Search, ScanLine, Eye, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface ActivityItem {
  id: string;
  action_type: string;
  created_at: string;
  game: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    cover_image_url: string | null;
  } | null;
}

const iconMap: Record<string, React.ReactNode> = {
  scan: <ScanLine className="h-4 w-4" />,
  search: <Search className="h-4 w-4" />,
  view: <Eye className="h-4 w-4" />,
};

const labelMap: Record<string, string> = {
  scan: "Scanné",
  search: "Recherché",
  view: "Consulté",
};

const ActivityHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("activity_history")
          .select("id, action_type, created_at, master_games(id, title, thumbnail_url, cover_image_url)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;
        setItems(
          (data || []).map((d: any) => ({
            ...d,
            game: d.master_games,
          }))
        );
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "À l'instant";
    if (mins < 60) return `Il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `Il y a ${days}j`;
    return d.toLocaleDateString("fr-FR");
  };

  if (loading) {
    return (
      <MainLayout showSearch={false}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showSearch={false}>
      <div className="max-w-3xl mx-auto px-4 pb-28">
        <div className="pt-6 pb-4">
          <h1 className="text-2xl font-bold">Historique</h1>
          <p className="text-sm text-muted-foreground">Vos recherches et scans récents</p>
        </div>

        {items.length === 0 && (
          <div className="text-center py-20">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-1">Aucun historique</h3>
            <p className="text-muted-foreground text-sm">Vos recherches et scans apparaîtront ici</p>
          </div>
        )}

        <div className="space-y-2 animate-fade-in">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => item.game && navigate(`/games/${item.game.id}`)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:shadow-sm transition-all text-left"
            >
              {item.game ? (
                <img
                  src={item.game.thumbnail_url || item.game.cover_image_url || "/placeholder.svg"}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <span className="text-xl">🎲</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm line-clamp-1">{item.game?.title || "Jeu inconnu"}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    {iconMap[item.action_type] || <Eye className="h-3 w-3" />}
                    {labelMap[item.action_type] || item.action_type}
                  </span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{formatTime(item.created_at)}</span>
            </button>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default ActivityHistory;
