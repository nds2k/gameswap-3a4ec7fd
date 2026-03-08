import { useState, useCallback, useRef, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, ScanLine, Star, Users, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CatalogGame {
  id: string;
  title: string;
  cover_image_url: string | null;
  release_year: number | null;
  min_players: number | null;
  max_players: number | null;
  play_time: string | null;
  publisher: string | null;
  category: string | null;
  popularity_score: number | null;
}

const GamesCatalog = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [popular, setPopular] = useState<CatalogGame[]>([]);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Load popular games on mount
  useEffect(() => {
    const fetchPopular = async () => {
      const { data } = await supabase
        .from("master_games")
        .select("id, title, cover_image_url, release_year, min_players, max_players, play_time, publisher, category, popularity_score")
        .order("popularity_score", { ascending: false })
        .limit(20);
      if (data) setPopular(data);
    };
    fetchPopular();
  }, []);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const { data, error } = await supabase.functions.invoke("bgg-search", {
        body: { query: searchQuery, limit: 20 },
      });
      if (error) throw error;
      setResults(data?.results || []);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const onInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleSearch(value), 400);
  };

  const displayGames = searched ? results : popular;

  return (
    <MainLayout showSearch={false}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 pb-28">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Catalogue</h1>
            <p className="text-sm text-muted-foreground">Recherchez parmi des milliers de jeux</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/scanner")} className="gap-1.5">
            <ScanLine className="h-4 w-4" />
            Scanner
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Rechercher un jeu de société..."
            className="pl-11 h-12 rounded-full bg-card border-border"
          />
          {loading && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
          )}
        </div>

        {/* Section title */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-0.5 bg-primary rounded-full" />
          <span className="text-sm font-bold text-primary uppercase tracking-wide">
            {searched ? `${results.length} résultat${results.length > 1 ? "s" : ""}` : "Populaires"}
          </span>
        </div>

        {/* Results grid */}
        {loading && !results.length ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : displayGames.length === 0 && searched ? (
          <div className="text-center py-16">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Aucun résultat</h3>
            <p className="text-muted-foreground">Essayez un autre terme de recherche</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {displayGames.map((game) => (
              <button
                key={game.id}
                onClick={() => navigate(`/games/${game.id}`)}
                className="game-card text-left group"
              >
                <div className="aspect-[3/4] overflow-hidden">
                  {game.cover_image_url ? (
                    <img
                      src={game.cover_image_url}
                      alt={game.title}
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
                  <h3 className="font-bold text-sm line-clamp-2 leading-tight">{game.title}</h3>
                  {game.release_year && (
                    <p className="text-xs text-muted-foreground">{game.release_year}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {game.min_players && (
                      <span className="flex items-center gap-0.5">
                        <Users className="h-3 w-3" />
                        {game.min_players}{game.max_players ? `-${game.max_players}` : ""}
                      </span>
                    )}
                    {game.play_time && (
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-3 w-3" />
                        {game.play_time}'
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default GamesCatalog;
