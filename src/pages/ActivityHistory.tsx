import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { History, Search, ScanLine, Loader2, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ActivityItem {
  id: string;
  game_id: string | null;
  action_type: string;
  created_at: string;
  game?: {
    title: string;
    cover_image_url: string | null;
  } | null;
}

const ActivityHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("activity_history")
          .select("id, game_id, action_type, created_at, master_games(title, cover_image_url)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) throw error;

        const mapped = (data || []).map((item: any) => ({
          id: item.id,
          game_id: item.game_id,
          action_type: item.action_type,
          created_at: item.created_at,
          game: item.master_games,
        }));

        setActivities(mapped);
      } catch (err) {
        console.error("Error fetching history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  const handleClearHistory = async () => {
    if (!user) return;
    try {
      await supabase.from("activity_history").delete().eq("user_id", user.id);
      setActivities([]);
      toast({ title: "Historique effacé" });
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <MainLayout showSearch={false}>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showSearch={false}>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-28">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <History className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Historique</h1>
              <p className="text-muted-foreground">{activities.length} action{activities.length > 1 ? "s" : ""}</p>
            </div>
          </div>
          {activities.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClearHistory} className="text-muted-foreground">
              <Trash2 className="h-4 w-4 mr-1" />
              Effacer
            </Button>
          )}
        </div>

        {/* Empty state */}
        {activities.length === 0 ? (
          <div className="text-center py-16">
            <History className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Aucune activité</h3>
            <p className="text-muted-foreground mb-4">Vos recherches et scans apparaîtront ici</p>
            <Button variant="gameswap" onClick={() => navigate("/games")}>
              Rechercher un jeu
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {activities.map((activity) => (
              <button
                key={activity.id}
                onClick={() => activity.game_id && navigate(`/games/${activity.game_id}`)}
                className="w-full flex items-center gap-3 p-3 bg-card rounded-xl border border-border hover:border-primary/30 transition-colors text-left"
                disabled={!activity.game_id}
              >
                {/* Icon */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  activity.action_type === "scan" ? "bg-accent/10" : "bg-primary/10"
                }`}>
                  {activity.action_type === "scan" ? (
                    <ScanLine className="h-4 w-4 text-accent" />
                  ) : (
                    <Search className="h-4 w-4 text-primary" />
                  )}
                </div>

                {/* Game info */}
                {activity.game?.cover_image_url && (
                  <img
                    src={activity.game.cover_image_url}
                    alt=""
                    className="w-10 h-10 rounded-lg object-cover shrink-0"
                  />
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {activity.game?.title || "Jeu inconnu"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activity.action_type === "scan" ? "Scanné" : "Recherché"} • {format(new Date(activity.created_at), "dd MMM yyyy à HH:mm", { locale: fr })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ActivityHistory;
