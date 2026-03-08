import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, Users, Clock, Calendar, Plus, Check, Loader2, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface GameDetail {
  id: string;
  title: string;
  cover_image_url: string | null;
  thumbnail_url: string | null;
  description: string | null;
  release_year: number | null;
  min_players: number | null;
  max_players: number | null;
  min_age: number | null;
  play_time: string | null;
  rating: number | null;
  num_reviews: number | null;
  publisher: string | null;
  category: string | null;
  bgg_id: number | null;
}

interface PricePoint {
  date: string;
  price: number;
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
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [listings, setListings] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        // Fetch game
        const { data: gameData, error } = await supabase
          .from("master_games")
          .select("*")
          .eq("id", id)
          .single();
        if (error) throw error;
        setGame(gameData);

        // Check if in collection
        if (user) {
          const { data: colData } = await supabase
            .from("user_collections")
            .select("id")
            .eq("user_id", user.id)
            .eq("game_id", id)
            .maybeSingle();
          setInCollection(!!colData);
        }

        // Fetch price history
        const { data: prices } = await supabase
          .from("game_price_history")
          .select("average_price, recorded_at")
          .eq("game_id", id)
          .order("recorded_at", { ascending: true });
        if (prices) {
          setPriceHistory(prices.map(p => ({
            date: new Date(p.recorded_at!).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
            price: p.average_price || 0,
          })));
        }

        // Fetch marketplace listings matching this title
        const { data: listingsData } = await supabase
          .from("games")
          .select("id, title, price, game_type, image_url, condition, status")
          .eq("status", "available")
          .ilike("title", `%${gameData.title.substring(0, 20)}%`)
          .limit(6);
        setListings(listingsData || []);

        // Log activity
        if (user) {
          await supabase.from("activity_history").insert({
            user_id: user.id, game_id: id, action_type: "view",
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, user]);

  const handleAddToCollection = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!game) return;
    setAdding(true);
    try {
      if (inCollection) {
        await supabase.from("user_collections").delete().eq("user_id", user.id).eq("game_id", game.id);
        setInCollection(false);
        toast({ title: "Retiré de la collection" });
      } else {
        const { error } = await supabase.from("user_collections").insert({
          user_id: user.id, game_id: game.id,
        });
        if (error) throw error;
        setInCollection(true);
        toast({ title: "Ajouté à ma collection ! 🎉" });
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
          <h2 className="text-xl font-bold mb-2">Jeu introuvable</h2>
          <Button variant="outline" onClick={() => navigate("/games")}>Retour au catalogue</Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showSearch={false}>
      <div className="max-w-3xl mx-auto px-4 pb-28">
        {/* Back */}
        <div className="pt-4 pb-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour
          </Button>
        </div>

        {/* Hero */}
        <div className="rounded-2xl overflow-hidden border border-border bg-card mb-6">
          {game.cover_image_url && (
            <img src={game.cover_image_url} alt={game.title} className="w-full h-64 object-cover" />
          )}
          <div className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold">{game.title}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {game.release_year && (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" /> {game.release_year}
                    </span>
                  )}
                  {game.publisher && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">{game.publisher}</span>
                  )}
                  {game.category && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                      <Tag className="h-3 w-3 inline mr-1" />{game.category}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-4">
              {game.rating != null && game.rating > 0 && (
                <div className="flex items-center gap-1.5">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-bold">{game.rating.toFixed(1)}</span>
                  {game.num_reviews != null && game.num_reviews > 0 && (
                    <span className="text-sm text-muted-foreground">({game.num_reviews.toLocaleString()})</span>
                  )}
                </div>
              )}
              {game.min_players && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {game.min_players}{game.max_players ? `-${game.max_players}` : ""} joueurs
                </div>
              )}
              {game.play_time && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {game.play_time} min
                </div>
              )}
              {game.min_age && (
                <span className="text-sm text-muted-foreground">{game.min_age}+ ans</span>
              )}
            </div>

            {/* Add to collection */}
            <Button
              variant={inCollection ? "outline" : "gameswap"}
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
              {inCollection ? "Dans ma collection" : "Ajouter à mes jeux"}
            </Button>
          </div>
        </div>

        {/* Description */}
        {game.description && (
          <div className="bg-card rounded-2xl border border-border p-5 mb-6">
            <h2 className="font-bold text-lg mb-3">Description</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
              {game.description}
            </p>
          </div>
        )}

        {/* Price History Chart */}
        {priceHistory.length > 1 && (
          <div className="bg-card rounded-2xl border border-border p-5 mb-6">
            <h2 className="font-bold text-lg mb-3">Historique des prix</h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={priceHistory}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.75rem",
                      fontSize: 12,
                    }}
                    formatter={(val: number) => [`${val.toFixed(0)} €`, "Prix moyen"]}
                  />
                  <Line type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Marketplace Listings */}
        {listings.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-5 mb-6">
            <h2 className="font-bold text-lg mb-3">Annonces sur la marketplace</h2>
            <div className="space-y-3">
              {listings.map((l) => (
                <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                  <img src={l.image_url || "/placeholder.svg"} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm line-clamp-1">{l.title}</p>
                    <p className="text-xs text-muted-foreground">{l.condition || "Non spécifié"}</p>
                  </div>
                  {l.price && <span className="font-bold text-primary">{l.price}€</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default GameDetailPage;
