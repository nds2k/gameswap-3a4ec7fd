import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { BookOpen, Plus, Loader2, Users, Clock, Trash2, ScanLine } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface CollectionGame {
  id: string;
  game_id: string;
  created_at: string;
  master_game: {
    id: string;
    title: string;
    cover_image_url: string | null;
    min_players: number | null;
    max_players: number | null;
    play_time: string | null;
    release_year: number | null;
    popularity_score: number | null;
  };
}

const MyCollection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [collection, setCollection] = useState<CollectionGame[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCollection = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_collections")
        .select("id, game_id, created_at, master_games(id, title, cover_image_url, min_players, max_players, play_time, release_year, popularity_score)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((item: any) => ({
        id: item.id,
        game_id: item.game_id,
        created_at: item.created_at,
        master_game: item.master_games,
      })).filter((item: any) => item.master_game);

      setCollection(mapped);
    } catch (err) {
      console.error("Error fetching collection:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollection();
  }, [user]);

  const handleRemove = async (collectionId: string) => {
    try {
      await supabase.from("user_collections").delete().eq("id", collectionId);
      setCollection((prev) => prev.filter((c) => c.id !== collectionId));
      toast({ title: "Jeu retiré de votre collection" });
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-28">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Ma Collection</h1>
              <p className="text-muted-foreground">{collection.length} jeu{collection.length > 1 ? "x" : ""} à la maison</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/scanner")}>
              <ScanLine className="h-4 w-4 mr-1" />
              Scanner
            </Button>
            <Button variant="gameswap" size="sm" onClick={() => navigate("/games")}>
              <Plus className="h-4 w-4 mr-1" />
              Ajouter
            </Button>
          </div>
        </div>

        {/* Empty state */}
        {collection.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Votre collection est vide</h3>
            <p className="text-muted-foreground mb-4">Scannez ou recherchez des jeux pour les ajouter</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate("/scanner")}>
                <ScanLine className="h-4 w-4 mr-1" />
                Scanner
              </Button>
              <Button variant="gameswap" onClick={() => navigate("/games")}>
                <Plus className="h-4 w-4 mr-1" />
                Rechercher
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {collection.map((item) => (
              <div key={item.id} className="game-card group relative">
                <button
                  onClick={() => navigate(`/games/${item.game_id}`)}
                  className="w-full text-left"
                >
                  <div className="aspect-[3/4] overflow-hidden">
                    {item.master_game.cover_image_url ? (
                      <img
                        src={item.master_game.cover_image_url}
                        alt={item.master_game.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <span className="text-3xl">🎲</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 space-y-1.5">
                    <h3 className="font-bold text-sm line-clamp-2 leading-tight">{item.master_game.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {item.master_game.min_players && (
                        <span className="flex items-center gap-0.5">
                          <Users className="h-3 w-3" />
                          {item.master_game.min_players}{item.master_game.max_players ? `-${item.master_game.max_players}` : ""}
                        </span>
                      )}
                      {item.master_game.play_time && (
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-3 w-3" />
                          {item.master_game.play_time}'
                        </span>
                      )}
                    </div>
                  </div>
                </button>
                {/* Remove button */}
                <button
                  onClick={() => handleRemove(item.id)}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default MyCollection;
