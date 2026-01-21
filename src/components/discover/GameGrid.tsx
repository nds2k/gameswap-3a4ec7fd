import { Heart, MapPin } from "lucide-react";
import { useState } from "react";

interface Game {
  id: string;
  title: string;
  price: number;
  type: "sale" | "trade" | "showcase";
  image: string;
  seller: {
    name: string;
    avatar: string;
  };
  distance: string;
  condition: string;
}

const mockGames: Game[] = [
  {
    id: "1",
    title: "Catan",
    price: 25,
    type: "sale",
    image: "https://images.unsplash.com/photo-1632501641765-e568d28b0015?w=400",
    seller: { name: "Marie", avatar: "M" },
    distance: "2.3 km",
    condition: "Excellent",
  },
  {
    id: "2",
    title: "Ticket to Ride",
    price: 35,
    type: "sale",
    image: "https://images.unsplash.com/photo-1606503153255-59d7088e26c4?w=400",
    seller: { name: "Pierre", avatar: "P" },
    distance: "1.8 km",
    condition: "Très bon",
  },
  {
    id: "3",
    title: "Pandemic",
    price: 0,
    type: "trade",
    image: "https://images.unsplash.com/photo-1611371805429-8b5c1b2c34ba?w=400",
    seller: { name: "Sophie", avatar: "S" },
    distance: "5.1 km",
    condition: "Bon",
  },
  {
    id: "4",
    title: "7 Wonders",
    price: 30,
    type: "sale",
    image: "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=400",
    seller: { name: "Lucas", avatar: "L" },
    distance: "3.2 km",
    condition: "Comme neuf",
  },
  {
    id: "5",
    title: "Wingspan",
    price: 0,
    type: "showcase",
    image: "https://images.unsplash.com/photo-1566694271453-390536dd1f0d?w=400",
    seller: { name: "Emma", avatar: "E" },
    distance: "4.7 km",
    condition: "Collection",
  },
  {
    id: "6",
    title: "Azul",
    price: 28,
    type: "sale",
    image: "https://images.unsplash.com/photo-1563941402830-3a422052096b?w=400",
    seller: { name: "Hugo", avatar: "H" },
    distance: "0.8 km",
    condition: "Excellent",
  },
];

interface GameGridProps {
  searchQuery: string;
  filter: string;
}

export const GameGrid = ({ searchQuery, filter }: GameGridProps) => {
  const filteredGames = mockGames.filter((game) => {
    const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === "all" || game.type === filter;
    return matchesSearch && matchesFilter;
  });

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in">
      {filteredGames.map((game) => (
        <GameCard key={game.id} game={game} />
      ))}
    </div>
  );
};

const GameCard = ({ game }: { game: Game }) => {
  const [isWishlisted, setIsWishlisted] = useState(false);

  return (
    <div className="game-card group cursor-pointer">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={game.image}
          alt={game.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        
        {/* Wishlist button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsWishlisted(!isWishlisted);
          }}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110"
        >
          <Heart
            className={`h-5 w-5 transition-colors ${
              isWishlisted ? "fill-destructive text-destructive" : "text-muted-foreground"
            }`}
          />
        </button>

        {/* Type badge */}
        <div className="absolute bottom-3 left-3">
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              game.type === "sale"
                ? "bg-primary text-primary-foreground"
                : game.type === "trade"
                ? "bg-blue-500 text-white"
                : "bg-purple-500 text-white"
            }`}
          >
            {game.type === "sale" ? "Vente" : game.type === "trade" ? "Échange" : "Présentation"}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-base line-clamp-1">{game.title}</h3>
          {game.type === "sale" && (
            <span className="font-bold text-primary shrink-0">{game.price}€</span>
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-3">{game.condition}</p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-xs font-semibold text-primary">{game.seller.avatar}</span>
            </div>
            <span className="text-sm text-muted-foreground">{game.seller.name}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span className="text-xs">{game.distance}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
