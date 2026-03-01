import { Heart, MapPin, MessageCircle, Zap } from "lucide-react";
import { useState, useMemo, memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useWishlist } from "@/hooks/useWishlist";
import { useGames, type Game } from "@/hooks/useGames";
import { GameDetailModal } from "@/components/games/GameDetailModal";
import { useAuth } from "@/contexts/AuthContext";
import type { AdvancedFilterState } from "./AdvancedFilters";

interface GameGridProps {
  searchQuery: string;
  filter: string;
  advancedFilters?: AdvancedFilterState;
}

export const GameGrid = ({ searchQuery, filter, advancedFilters }: GameGridProps) => {
  const { games, loading } = useGames();
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const filteredGames = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return games.filter((game) => {
      const matchesSearch = game.title.toLowerCase().includes(query);
      const matchesFilter = filter === "all" || game.game_type === filter;
      if (!matchesSearch || !matchesFilter) return false;

      // Advanced filters
      if (advancedFilters) {
        if (advancedFilters.categories.length > 0) {
          const gameCat = (game as any).category;
          if (!gameCat || !advancedFilters.categories.includes(gameCat)) return false;
        }
        if (advancedFilters.conditions.length > 0) {
          if (!game.condition || !advancedFilters.conditions.includes(game.condition)) return false;
        }
        if (advancedFilters.priceRange[0] > 0 || advancedFilters.priceRange[1] < 200) {
          const price = game.price ?? 0;
          if (price < advancedFilters.priceRange[0]) return false;
          if (advancedFilters.priceRange[1] < 200 && price > advancedFilters.priceRange[1]) return false;
        }
      }

      return true;
    });
  }, [games, searchQuery, filter, advancedFilters]);

  const handleGameClick = useCallback((gameId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setSelectedGameId(gameId);
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-card rounded-2xl border border-border overflow-hidden animate-pulse">
            <div className="aspect-[4/3] bg-muted" />
            <div className="p-3 sm:p-4 space-y-3">
              <div className="h-5 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (filteredGames.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <span className="text-3xl">🎲</span>
        </div>
        <h3 className="font-semibold text-lg mb-2">Aucun jeu trouvé</h3>
        <p className="text-muted-foreground">Essayez de modifier vos filtres</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 animate-fade-in">
        {filteredGames.map((game) => (
          <GameCard 
            key={game.id} 
            game={game} 
            onClick={() => handleGameClick(game.id)}
            isAuthenticated={!!user}
          />
        ))}
      </div>

      <GameDetailModal
        gameId={selectedGameId}
        open={!!selectedGameId}
        onOpenChange={(open) => !open && setSelectedGameId(null)}
      />
    </>
  );
};

interface GameCardProps {
  game: Game;
  onClick: () => void;
  isAuthenticated: boolean;
}

const GameCard = memo(({ game, onClick, isAuthenticated }: GameCardProps) => {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  const wishlisted = isAuthenticated && isInWishlist(game.id);

  const ownerName = game.owner?.full_name || "Vendeur";
  const avatarLetter = ownerName.charAt(0).toUpperCase();

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }
    toggleWishlist(game.id);
  };

  return (
    <div
      className={`game-card group cursor-pointer relative transition-all ${
        game.is_boosted ? "ring-2 ring-primary shadow-[0_0_18px_hsl(var(--primary)/0.35)]" : ""
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {game.image_url ? (
          <img
            src={game.image_url}
            alt={game.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-4xl">🎲</span>
          </div>
        )}

        {/* Boosted badge */}
        {game.is_boosted && (
          <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow">
            <Zap className="h-3 w-3" />
            Boosté
          </div>
        )}

        {/* Wishlist button */}
        <button
          onClick={handleWishlistClick}
          className="absolute top-3 right-3 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110"
        >
          <Heart
            className={`h-4 w-4 sm:h-5 sm:w-5 transition-colors ${
              wishlisted ? "fill-destructive text-destructive" : "text-muted-foreground"
            }`}
          />
        </button>

        {/* Chat bubble on hover */}
        <div
          className={`absolute bottom-3 right-3 transition-all duration-200 ${
            isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
          >
            <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Type badge */}
        <div className="absolute bottom-3 left-3">
          <span
            className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${
              game.game_type === "sale"
                ? "bg-primary text-primary-foreground"
                : "bg-blue-500 text-white"
            }`}
          >
            {game.game_type === "sale" ? "Vente" : "Échange"}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2 mb-1.5 sm:mb-2">
          <h3 className="font-bold text-sm sm:text-base line-clamp-1">{game.title}</h3>
          {game.game_type === "sale" && game.price != null && (
            <span className="font-bold text-primary shrink-0 text-sm sm:text-base">{game.price}€</span>
          )}
        </div>

        <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">{game.condition || "Non spécifié"}</p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {game.owner?.avatar_url ? (
              <img
                src={game.owner.avatar_url}
                alt=""
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover"
              />
            ) : (
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-[10px] sm:text-xs font-semibold text-primary">{avatarLetter}</span>
              </div>
            )}
            <span className="text-xs sm:text-sm text-muted-foreground truncate max-w-[80px]">{ownerName}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span className="text-[10px] sm:text-xs">~2 km</span>
          </div>
        </div>
      </div>
    </div>
  );
});

GameCard.displayName = "GameCard";
