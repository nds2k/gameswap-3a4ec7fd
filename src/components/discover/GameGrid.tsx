import { Heart, MapPin, MessageCircle } from "lucide-react";
import { useState } from "react";
import { useWishlist } from "@/hooks/useWishlist";
import { useGames, type Game } from "@/hooks/useGames";
import { GameDetailModal } from "@/components/games/GameDetailModal";

// Mock games for fallback
const mockGames: Game[] = [
  {
    id: "mock-1",
    title: "Catan",
    price: 25,
    game_type: "sale",
    image_url: "https://images.unsplash.com/photo-1632501641765-e568d28b0015?w=400",
    owner_id: "",
    condition: "Excellent",
    description: null,
    created_at: new Date().toISOString(),
    status: "available",
    view_count: 45,
    owner: { full_name: "Marie", avatar_url: null },
  },
  {
    id: "mock-2",
    title: "Ticket to Ride",
    price: 35,
    game_type: "sale",
    image_url: "https://images.unsplash.com/photo-1606503153255-59d7088e26c4?w=400",
    owner_id: "",
    condition: "Très bon",
    description: null,
    created_at: new Date().toISOString(),
    status: "available",
    view_count: 32,
    owner: { full_name: "Pierre", avatar_url: null },
  },
  {
    id: "mock-3",
    title: "Pandemic",
    price: 0,
    game_type: "trade",
    image_url: "https://images.unsplash.com/photo-1611371805429-8b5c1b2c34ba?w=400",
    owner_id: "",
    condition: "Bon",
    description: null,
    created_at: new Date().toISOString(),
    status: "available",
    view_count: 28,
    owner: { full_name: "Sophie", avatar_url: null },
  },
  {
    id: "mock-4",
    title: "7 Wonders",
    price: 30,
    game_type: "sale",
    image_url: "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=400",
    owner_id: "",
    condition: "Comme neuf",
    description: null,
    created_at: new Date().toISOString(),
    status: "available",
    view_count: 56,
    owner: { full_name: "Lucas", avatar_url: null },
  },
  {
    id: "mock-5",
    title: "Wingspan",
    price: 0,
    game_type: "showcase",
    image_url: "https://images.unsplash.com/photo-1566694271453-390536dd1f0d?w=400",
    owner_id: "",
    condition: "Collection",
    description: null,
    created_at: new Date().toISOString(),
    status: "available",
    view_count: 89,
    owner: { full_name: "Emma", avatar_url: null },
  },
  {
    id: "mock-6",
    title: "Azul",
    price: 28,
    game_type: "sale",
    image_url: "https://images.unsplash.com/photo-1563941402830-3a422052096b?w=400",
    owner_id: "",
    condition: "Excellent",
    description: null,
    created_at: new Date().toISOString(),
    status: "available",
    view_count: 41,
    owner: { full_name: "Hugo", avatar_url: null },
  },
];

interface GameGridProps {
  searchQuery: string;
  filter: string;
}

export const GameGrid = ({ searchQuery, filter }: GameGridProps) => {
  const { games: dbGames, loading } = useGames();
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  // Use DB games if available, otherwise fall back to mock games
  const games = dbGames.length > 0 ? dbGames : mockGames;

  const filteredGames = games.filter((game) => {
    const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === "all" || game.game_type === filter;
    return matchesSearch && matchesFilter;
  });

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
          <GameCard key={game.id} game={game} onClick={() => setSelectedGameId(game.id)} />
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

const GameCard = ({ game, onClick }: { game: Game; onClick: () => void }) => {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [isHovered, setIsHovered] = useState(false);
  const wishlisted = isInWishlist(game.id);

  const ownerName = game.owner?.full_name || "Vendeur";
  const avatarLetter = ownerName.charAt(0).toUpperCase();

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
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(game.id);
          }}
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
