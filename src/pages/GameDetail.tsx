import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, Users, Clock, Calendar, Plus, Check, Loader2, Tag, Brain, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

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
  complexity: number | null;
}

interface SalePoint {
  date: string;
  price: number;
  rawDate: Date;
}

interface RecentSale {
  id: string;
  price: number;
  condition: string | null;
  sold_at: string;
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
  const [salesData, setSalesData] = useState<SalePoint[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [listings, setListings] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const { data: gameData, error } = await supabase
          .from("master_games")
          .select("*")
          .eq("id", id)
          .single();
        if (error) throw error;
        setGame(gameData as unknown as GameDetail);

        // Parallel fetches
        const collectionPromise = user
          ? supabase.from("user_collections").select("id")
              .eq("user_id", user.id).eq("game_id", id).maybeSingle()
              .then(({ data }) => setInCollection(!!data))
          : Promise.resolve();

        const salesPromise = supabase.from("sales_history").select("*")
          .eq("game_id", id).order("sold_at", { ascending: true })
          .then(({ data }) => {
            if (data && data.length > 0) {
              setSalesData(data.map((s: any) => ({
                date: new Date(s.sold_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
                price: Number(s.price),
                rawDate: new Date(s.sold_at),
              })));
              setRecentSales(data.slice(-5).reverse().map((s: any) => ({
                id: s.id, price: Number(s.price), condition: s.condition, sold_at: s.sold_at,
              })));
            }
          });

        const listingsPromise = supabase.from("games").select("id, title, price, game_type, image_url, condition, status")
          .eq("status", "available")
          .ilike("title", `%${gameData.title.substring(0, 20)}%`)
          .limit(6)
          .then(({ data }) => setListings(data || []));

        const activityPromise = user
          ? supabase.from("activity_history").insert({
              user_id: user.id, game_id: id, action_type: "view",
            }).then(() => {})
          : Promise.resolve();

        await Promise.all([collectionPromise, salesPromise, listingsPromise, activityPromise]);
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

  // StockX-style stats
  const lastPrice = salesData.length > 0 ? salesData[salesData.length - 1].price : null;
  const prevPrice = salesData.length > 1 ? salesData[salesData.length - 2].price : null;
  const priceChange = lastPrice && prevPrice ? ((lastPrice - prevPrice) / prevPrice * 100) : null;
  const avgPrice = salesData.length > 0 ? salesData.reduce((s, p) => s + p.price, 0) / salesData.length : null;

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

  const complexityLabel = game.complexity
    ? game.complexity < 2 ? "Facile" : game.complexity < 3 ? "Moyen" : game.complexity < 4 ? "Complexe" : "Expert"
    : null;

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
        <div className="rounded-2xl overflow-hidden border border-border bg-card mb-5">
          {game.cover_image_url && (
            <img src={game.cover_image_url} alt={game.title} className="w-full h-56 object-cover" />
          )}
          <div className="p-4 space-y-3">
            <div>
              <h1 className="text-xl font-bold">{game.title}</h1>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                {game.release_year && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" /> {game.release_year}
                  </span>
                )}
                {game.publisher && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{game.publisher}</span>
                )}
                {game.category && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    <Tag className="h-3 w-3 inline mr-0.5" />{game.category}
                  </span>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-3 text-sm">
              {game.rating != null && game.rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-bold">{game.rating.toFixed(1)}</span>
                  {game.num_reviews != null && game.num_reviews > 0 && (
                    <span className="text-xs text-muted-foreground">({game.num_reviews.toLocaleString()})</span>
                  )}
                </div>
              )}
              {game.min_players && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {game.min_players}{game.max_players ? `-${game.max_players}` : ""}
                </div>
              )}
              {game.play_time && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {game.play_time} min
                </div>
              )}
              {game.complexity != null && game.complexity > 0 && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Brain className="h-3.5 w-3.5" />
                  {game.complexity.toFixed(1)}/5 · {complexityLabel}
                </div>
              )}
              {game.min_age && (
                <span className="text-xs text-muted-foreground">{game.min_age}+ ans</span>
              )}
            </div>

            <Button
              variant={inCollection ? "outline" : "gameswap"}
              className="w-full"
              onClick={handleAddToCollection}
              disabled={adding}
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                : inCollection ? <Check className="h-4 w-4 mr-2" />
                : <Plus className="h-4 w-4 mr-2" />}
              {inCollection ? "Dans ma collection" : "Ajouter à mes jeux"}
            </Button>
          </div>
        </div>

        {/* Description */}
        {game.description && (
          <div className="bg-card rounded-2xl border border-border p-4 mb-5">
            <h2 className="font-bold text-base mb-2">Description</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
              {game.description}
            </p>
          </div>
        )}

        {/* StockX-style Price Chart */}
        {salesData.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-4 mb-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-base">Prix du marché</h2>
              {lastPrice != null && (
                <div className="text-right">
                  <span className="text-lg font-bold">{lastPrice.toFixed(0)} €</span>
                  {priceChange != null && (
                    <div className={`flex items-center gap-0.5 text-xs ${priceChange >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {priceChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(1)}%
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Stats pills */}
            <div className="flex gap-2 mb-3 overflow-x-auto">
              {lastPrice != null && (
                <div className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-muted text-center">
                  <p className="text-[10px] text-muted-foreground">Dernière vente</p>
                  <p className="text-sm font-bold">{lastPrice.toFixed(0)} €</p>
                </div>
              )}
              {avgPrice != null && (
                <div className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-muted text-center">
                  <p className="text-[10px] text-muted-foreground">Prix moyen</p>
                  <p className="text-sm font-bold">{avgPrice.toFixed(0)} €</p>
                </div>
              )}
              <div className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-muted text-center">
                <p className="text-[10px] text-muted-foreground">Ventes</p>
                <p className="text-sm font-bold">{salesData.length}</p>
              </div>
            </div>

            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData}>
                  <defs>
                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.75rem",
                      fontSize: 12,
                    }}
                    formatter={(val: number) => [`${val.toFixed(0)} €`, "Prix de vente"]}
                  />
                  <Area type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#priceGradient)" dot={{ r: 3, fill: "hsl(var(--primary))" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Recent Sales */}
        {recentSales.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-4 mb-5">
            <h2 className="font-bold text-base mb-3">Dernières ventes</h2>
            <div className="space-y-2">
              {recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-muted/50">
                  <div>
                    <span className="text-sm font-medium">{sale.condition || "Non spécifié"}</span>
                    <p className="text-xs text-muted-foreground">
                      {new Date(sale.sold_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <span className="font-bold text-primary">{Number(sale.price).toFixed(0)} €</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Marketplace Listings */}
        {listings.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-4 mb-5">
            <h2 className="font-bold text-base mb-3">Annonces sur la marketplace</h2>
            <div className="space-y-2">
              {listings.map((l) => (
                <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                  <img src={l.image_url || "/placeholder.svg"} alt="" className="w-11 h-11 rounded-lg object-cover" />
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
