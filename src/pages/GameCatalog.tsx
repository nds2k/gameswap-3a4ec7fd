import { useState, useCallback, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Search, Loader2, Star, Users, Clock, ScanLine } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface CatalogGame {
  id: string;
  title: string;
  cover_image_url: string | null;
  thumbnail_url: string | null;
  release_year: number | null;
  min_players: number | null;
  max_players: number | null;
  play_time: string | null;
  rating: number | null;
  num_reviews: number | null;
  publisher: string | null;
  category: string | null;
}

const GameCatalog = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    try {
      const { data, error } = await supabase.functions.invoke("bgg-search", { body: { query: q } });
      if (error) throw error;
      setResults(data?.games || []);

      // Log search activity
      if (user && data?.games?.length > 0) {
        await supabase.from("activity_history").insert({
          user_id: user.id,
          game_id: data.games[0].id,
          action_type: "search",
        }).then(() => {});
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(val), 500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(query);
  };

  return (
    <MainLayout showSearch={false}>
      <div className="max-w-3xl mx-auto px-4 pb-28">
        {/* Header */}
        <div className="pt-6 pb-4">
          <h1 className="text-2xl font-bold mb-1">Catalogue de jeux</h1>
          <p className="text-sm text-muted-foreground">Recherchez parmi des milliers de jeux de société</p>
        </div>

        {/* Search */}
        <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={handleInputChange}
              placeholder="Rechercher un jeu..."
              className="pl-10"
            />
          </div>
          <Button variant="gameswap" type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Chercher"}
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigate("/scanner")} title="Scanner">
            <ScanLine className="h-4 w-4" />
          </Button>
        </form>

        {/* Results */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="text-center py-16">
            <span className="text-4xl mb-4 block">🔍</span>
            <h3 className="font-semibold text-lg mb-1">Aucun résultat</h3>
            <p className="text-muted-foreground text-sm">Essayez un autre nom de jeu</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-3 animate-fade-in">
            {results.map((game) => (
              <button
                key={game.id}
                onClick={() => navigate(`/games/${game.id}`)}
                className="w-full bg-card rounded-2xl border border-border p-3 flex gap-4 items-center text-left hover:shadow-md transition-all hover:-translate-y-0.5"
              >
                <img
                  src={game.thumbnail_url || game.cover_image_url || "/placeholder.svg"}
                  alt={game.title}
                  className="w-16 h-16 rounded-xl object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm line-clamp-1">{game.title}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {game.release_year && (
                      <span className="text-xs text-muted-foreground">{game.release_year}</span>
                    )}
                    {game.publisher && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{game.publisher}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    {game.rating != null && game.rating > 0 && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {game.rating.toFixed(1)}
                      </span>
                    )}
                    {game.min_players && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {game.min_players}{game.max_players ? `-${game.max_players}` : ""}
                      </span>
                    )}
                    {game.play_time && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {game.play_time} min
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Empty state when no search */}
        {!searched && !loading && (
          <div className="text-center py-16">
            <span className="text-5xl mb-4 block">🎲</span>
            <h3 className="font-semibold text-lg mb-1">Explorez le catalogue</h3>
            <p className="text-muted-foreground text-sm mb-6">Tapez un nom pour rechercher dans BoardGameGeek</p>
            <Button variant="outline" onClick={() => navigate("/scanner")}>
              <ScanLine className="h-4 w-4 mr-2" />
              Ou scannez un code-barres
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default GameCatalog;
