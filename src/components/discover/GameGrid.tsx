import { Heart, MapPin, MessageCircle } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWishlist } from "@/hooks/useWishlist";
import { useGames, type Game } from "@/hooks/useGames";
import { GameDetailModal } from "@/components/games/GameDetailModal";
import { useAuth } from "@/contexts/AuthContext";

interface GameGridProps {
  searchQuery: string;
  filter: string;
}

export const GameGrid = ({ searchQuery, filter }: GameGridProps) => {
  const { games, loading } = useGames();
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const filteredGames = games.filter((game) => {
    const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === "all" || game.game_type === filter;
    return matchesSearch && matchesFilter;
  });

  const handleGameClick = (gameId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setSelectedGameId(gameId);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-card rounded-2xl border border-border overflow-hidden animate-pulse">
            <div className="aspect-[4/3] bg-muted" />
            <div className="p-4 space-y-3">
              <div className="h-5 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="flex justify-between">
                <div className="h-4 bg-muted rounded w-1/4" />
                <div className="h-4 bg-muted rounded w-1/4" />
              </div>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in">
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

const GameCard = ({ game, onClick, isAuthenticated }: GameCardProps) => {
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
      className="game-card group cursor-pointer relative"
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
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-4xl">🎲</span>
          </div>
        )}

        {/* Wishlist button */}
        <button
          onClick={handleWishlistClick}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110"
        >
          <Heart
            className={`h-5 w-5 transition-colors ${
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
            className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
          >
            <MessageCircle className="h-5 w-5" />
          </button>
        </div>

        {/* Type badge */}
        <div className="absolute bottom-3 left-3">
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              game.game_type === "sale"
                ? "bg-primary text-primary-foreground"
                : game.game_type === "trade"
                ? "bg-blue-500 text-white"
                : "bg-purple-500 text-white"
            }`}
          >
            {game.game_type === "sale" ? "Vente" : game.game_type === "trade" ? "Échange" : "Présentation"}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-base line-clamp-1">{game.title}</h3>
          {game.game_type === "sale" && game.price != null && (
            <span className="font-bold text-primary shrink-0">{game.price}€</span>
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-3">{game.condition || "Non spécifié"}</p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {game.owner?.avatar_url ? (
              <img
                src={game.owner.avatar_url}
                alt=""
                className="w-7 h-7 rounded-full object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xs font-semibold text-primary">{avatarLetter}</span>
              </div>
            )}
            <span className="text-sm text-muted-foreground">{ownerName}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span className="text-xs">~2 km</span>
          </div>
        </div>
      </div>
    </div>
  );
};
