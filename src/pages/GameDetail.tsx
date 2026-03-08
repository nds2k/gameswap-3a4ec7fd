import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Clock, Calendar, Star, Plus, Check, Loader2, BookOpen } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface GameDetail {
  id: string;
  title: string;
  cover_image_url: string | null;
  description: string | null;
  release_year: number | null;
  min_players: number | null;
  max_players: number | null;
  min_age: number | null;
  play_time: string | null;
  publisher: string | null;
  category: string | null;
  popularity_score: number | null;
}

const GameDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [game, setGame] = useState<GameDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [inCollection, setInCollection] = useState(false);
  const [adding, setAdding] = useState(false);
  const [priceHistory, setPriceHistory] = useState<{ average_price: number; recorded_at: string }[]>([]);

  useEffect(() => {
    if (!id) return;

    const fetchGame = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("master_games")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setGame(data);

        // Check if in user collection
        if (user) {
          const { data: collectionItem } = await supabase
            .from("user_collections")
            .select("id")
            .eq("user_id", user.id)
            .eq("game_id", id)
            .maybeSingle();
          setInCollection(!!collectionItem);
        }

        // Fetch price history
        const { data: prices } = await supabase
          .from("game_price_history")
          .select("average_price, recorded_at")
          .eq("game_id", id)
          .order("recorded_at", { ascending: true });
        setPriceHistory(prices || []);
      } catch (err) {
        console.error("Error fetching game:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
  }, [id, user]);

  const handleAddToCollection = async () => {
    if (!user || !id) {
      toast({ title: "Connexion requise", variant: "destructive" });
      return;
    }

    setAdding(true);
    try {
      if (inCollection) {
        await supabase
          .from("user_collections")
          .delete()
          .eq("user_id", user.id)
          .eq("game_id", id);
        setInCollection(false);
        toast({ title: "Retiré de votre collection" });
      } else {
        const { error } = await supabase
          .from("user_collections")
          .insert({ user_id: user.id, game_id: id });
        if (error) throw error;
        setInCollection(true);
        toast({ title: "Ajouté à votre collection ! 🎉" });
      }
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
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

  if (!game) {
    return (
      <MainLayout showSearch={false}>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Jeu introuvable</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/games")}>
            Retour au catalogue
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showSearch={false}>
      <div className="max-w-2xl mx-auto pb-28">
        {/* Hero image */}
        <div className="relative">
          {game.cover_image_url ? (
            <img
              src={game.cover_image_url}
              alt={game.title}
              className="w-full aspect-[4/3] object-cover"
            />
          ) : (
            <div className="w-full aspect-[4/3] bg-muted flex items-center justify-center">
              <span className="text-6xl">🎲</span>
            </div>
          )}
          <div className="absolute top-4 left-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="bg-card/80 backdrop-blur-sm rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="px-4 py-6 space-y-6">
          {/* Title & year */}
          <div>
            <h1 className="text-2xl font-bold">{game.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              {game.release_year && (
                <span className="text-sm text-muted-foreground">{game.release_year}</span>
              )}
              {game.publisher && (
                <span className="text-sm text-muted-foreground">• {game.publisher}</span>
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex flex-wrap gap-2">
            {game.min_players && (
              <div className="flex items-center gap-1.5 px-3 py-2 bg-card rounded-xl border border-border text-sm">
                <Users className="h-4 w-4 text-primary" />
                <span>{game.min_players}{game.max_players ? `-${game.max_players}` : ""} joueurs</span>
              </div>
            )}
            {game.play_time && (
              <div className="flex items-center gap-1.5 px-3 py-2 bg-card rounded-xl border border-border text-sm">
                <Clock className="h-4 w-4 text-primary" />
                <span>{game.play_time} min</span>
              </div>
            )}
            {game.min_age && (
              <div className="flex items-center gap-1.5 px-3 py-2 bg-card rounded-xl border border-border text-sm">
                <Calendar className="h-4 w-4 text-primary" />
                <span>{game.min_age}+ ans</span>
              </div>
            )}
            {game.category && (
              <div className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 rounded-xl text-sm text-primary font-medium">
                <BookOpen className="h-4 w-4" />
                <span>{game.category}</span>
              </div>
            )}
          </div>

          {/* Add to collection button */}
          <Button
            variant={inCollection ? "outline" : "gameswap"}
            size="lg"
            className="w-full"
            onClick={handleAddToCollection}
            disabled={adding}
          >
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : inCollection ? (
              <Check className="h-4 w-4 mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            {inCollection ? "Dans ma collection" : "Ajouter à ma collection"}
          </Button>

          {/* Description */}
          {game.description && (
            <div className="space-y-2">
              <h2 className="font-bold text-lg">Description</h2>
              <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
                {game.description}
              </p>
            </div>
          )}

          {/* Price history */}
          {priceHistory.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-bold text-lg">Historique des prix</h2>
              <div className="bg-card rounded-2xl border border-border p-4">
                <div className="flex items-end gap-1 h-32">
                  {priceHistory.map((p, i) => {
                    const max = Math.max(...priceHistory.map((h) => h.average_price || 0));
                    const height = max > 0 ? ((p.average_price || 0) / max) * 100 : 0;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">{Math.round(p.average_price || 0)}€</span>
                        <div
                          className="w-full bg-primary/20 rounded-t-sm"
                          style={{ height: `${height}%`, minHeight: "4px" }}
                        >
                          <div className="w-full h-full bg-primary rounded-t-sm opacity-60" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Marketplace listings section */}
          <div className="space-y-3">
            <h2 className="font-bold text-lg">Annonces du marketplace</h2>
            <MarketplaceListings gameTitle={game.title} />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

// Sub-component for marketplace listings
const MarketplaceListings = ({ gameTitle }: { gameTitle: string }) => {
  const navigate = useNavigate();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("games")
        .select("id, title, price, game_type, image_url, condition, status")
        .eq("status", "available")
        .ilike("title", `%${gameTitle}%`)
        .limit(10);
      setListings(data || []);
      setLoading(false);
    };
    fetch();
  }, [gameTitle]);

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

  if (listings.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">Aucune annonce pour ce jeu</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {listings.map((l) => (
        <button
          key={l.id}
          onClick={() => navigate(`/`)}
          className="w-full flex items-center gap-3 p-3 bg-card rounded-xl border border-border hover:border-primary/30 transition-colors text-left"
        >
          <img
            src={l.image_url || "/placeholder.svg"}
            alt={l.title}
            className="w-12 h-12 rounded-lg object-cover"
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{l.title}</p>
            <p className="text-xs text-muted-foreground">{l.condition || "—"}</p>
          </div>
          {l.price != null && (
            <span className="text-sm font-bold text-primary">{l.price}€</span>
          )}
        </button>
      ))}
    </div>
  );
};

export default GameDetailPage;
