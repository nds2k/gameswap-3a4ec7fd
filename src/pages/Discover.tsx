import { useState, useMemo, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { TrendingUp, Clock, Zap, Sparkles, Heart, Search, SlidersHorizontal, ScanLine, MapPin } from "lucide-react";
import { useGames, type Game } from "@/hooks/useGames";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import { GameDetailModal } from "@/components/games/GameDetailModal";
import { AdBanner } from "@/components/ads/AdBanner";
import { useIsMobile } from "@/hooks/use-mobile";

const GameCard = ({ game, isFav, onFavToggle, onClick }: {
  game: Game;
  isFav: boolean;
  onFavToggle: () => void;
  onClick: () => void;
}) => (
  <div className="bg-card rounded-2xl border border-border/50 overflow-hidden cursor-pointer" onClick={onClick}>
    <div className="aspect-[4/3] overflow-hidden relative">
      {game.image_url ? (
        <img src={game.image_url} alt={game.title} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className="w-full h-full bg-muted flex items-center justify-center text-3xl">🎲</div>
      )}
      {/* Type badge */}
      <span className={`absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold ${
        game.game_type === "sale" ? "bg-primary text-primary-foreground" : "bg-blue-500 text-white"
      }`}>
        {game.game_type === "sale" ? "Vente" : "Échange"}
      </span>
      {/* Heart */}
      <button
        onClick={(e) => { e.stopPropagation(); onFavToggle(); }}
        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center"
      >
        <Heart className={`h-3.5 w-3.5 ${isFav ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
      </button>
      {game.is_boosted && (
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-yellow-500 text-white text-[9px] font-bold flex items-center gap-0.5">
          <Zap className="h-2.5 w-2.5" /> Boost
        </div>
      )}
    </div>
    <div className="p-2.5">
      <div className="flex items-start justify-between gap-1">
        <h3 className="text-xs font-bold line-clamp-1 flex-1">{game.title}</h3>
        {game.game_type === "sale" && game.price != null && (
          <span className="text-xs font-bold text-primary shrink-0">{game.price}€</span>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground mt-0.5">{game.condition || "—"}</p>
      {game.owner && (
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-[8px] font-bold text-primary">{game.owner.full_name?.[0]?.toUpperCase() || "?"}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">{game.owner.full_name || "Vendeur"}</span>
          </div>
          <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <MapPin className="h-2.5 w-2.5" />
            <span>~2 km</span>
          </div>
        </div>
      )}
    </div>
  </div>
);

const Discover = () => {
  const navigate = useNavigate();
  const { games, loading } = useGames();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const isMobile = useIsMobile();

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-3 py-2 space-y-3">
        {/* Search bar + scanner */}
        <div className="flex items-center gap-2">
          <div
            className="flex-1 relative cursor-pointer"
            onClick={() => navigate("/search")}
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <div className="w-full h-10 rounded-xl bg-muted/50 border border-border/50 pl-9 pr-3 flex items-center text-xs text-muted-foreground">
              Rechercher un jeu...
            </div>
          </div>
          <button
            onClick={() => navigate("/scanner")}
            className="w-10 h-10 rounded-xl border border-border/50 flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors shrink-0"
          >
            <ScanLine className="h-5 w-5" />
          </button>
        </div>

        {/* Filters */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/50 text-xs text-muted-foreground hover:bg-muted transition-colors"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filtres
        </button>

        {loading ? (
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                <div className="aspect-[4/3] bg-muted animate-pulse" />
                <div className="p-2.5 space-y-1.5">
                  <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
                  <div className="h-2.5 bg-muted rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Search className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="font-bold text-base mb-1">Aucune annonce</h3>
            <p className="text-sm text-muted-foreground">Soyez le premier à publier un jeu !</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {games.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                isFav={isFavorite(game.id)}
                onFavToggle={() => toggleFavorite(game.id)}
                onClick={() => setSelectedGameId(game.id)}
              />
            ))}
          </div>
        )}
      </div>

      <GameDetailModal
        gameId={selectedGameId}
        open={!!selectedGameId}
        onOpenChange={(open) => !open && setSelectedGameId(null)}
      />
    </MainLayout>
  );
};

export default Discover;
