import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Loader2, Star, Users, Clock, Trash2, Search, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface CollectionItem {
  id: string;
  game_id: string;
  created_at: string;
  condition: string | null;
  game: {
    id: string;
    title: string;
    cover_image_url: string | null;
    thumbnail_url: string | null;
    min_players: number | null;
    max_players: number | null;
    play_time: string | null;
    rating: number | null;
  };
}

const MyCollection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchCollection = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_collections")
        .select("id, game_id, created_at, condition, master_games(id, title, cover_image_url, thumbnail_url, min_players, max_players, play_time, rating)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

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

  useEffect(() => { fetchCollection(); }, [user]);

  const handleRemove = async (collectionId: string) => {
    try {
      await supabase.from("user_collections").delete().eq("id", collectionId);
      setItems((prev) => prev.filter((i) => i.id !== collectionId));
      toast({ title: "Jeu retiré de la collection" });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  const filtered = items.filter(i =>
    i.game?.title?.toLowerCase().includes(search.toLowerCase())
  );

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
        <div className="pt-6 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Mes jeux à la maison</h1>
            <p className="text-sm text-muted-foreground">{items.length} jeux dans votre collection</p>
          </div>
          <Button variant="gameswap" size="sm" onClick={() => navigate("/games")}>
            <Plus className="h-4 w-4 mr-1" />
            Ajouter
          </Button>
        </div>

        {/* Search */}
        {items.length > 0 && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrer ma collection..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm"
            />
          </div>
        )}

        {items.length === 0 && (
          <div className="text-center py-20">
            <span className="text-5xl mb-4 block">📦</span>
            <h3 className="font-semibold text-lg mb-2">Votre collection est vide</h3>
            <p className="text-muted-foreground text-sm mb-6">Recherchez des jeux et ajoutez-les à votre collection</p>
            <Button variant="gameswap" onClick={() => navigate("/games")}>
              <Search className="h-4 w-4 mr-2" />
              Explorer le catalogue
            </Button>
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-fade-in">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-card rounded-2xl border border-border overflow-hidden group cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5"
              onClick={() => navigate(`/games/${item.game_id}`)}
            >
              <div className="aspect-[3/4] overflow-hidden relative">
                <img
                  src={item.game?.cover_image_url || item.game?.thumbnail_url || "/placeholder.svg"}
                  alt={item.game?.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemove(item.id); }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="p-3">
                <h3 className="font-bold text-sm line-clamp-2 mb-1">{item.game?.title}</h3>
                <div className="flex items-center gap-2">
                  {item.game?.rating != null && item.game.rating > 0 && (
                    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {item.game.rating.toFixed(1)}
                    </span>
                  )}
                  {item.game?.min_players && (
                    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {item.game.min_players}{item.game.max_players ? `-${item.game.max_players}` : ""}
                    </span>
                  )}
                  {item.game?.play_time && (
                    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {item.game.play_time}′
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default MyCollection;
