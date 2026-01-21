import { Gamepad2, Plus, Edit, Eye, EyeOff } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface MyGame {
  id: string;
  title: string;
  price: number;
  type: "sale" | "trade" | "showcase";
  image: string;
  status: "active" | "sold" | "hidden";
  views: number;
  wishlistCount: number;
}

const mockMyGames: MyGame[] = [
  {
    id: "1",
    title: "Carcassonne",
    price: 20,
    type: "sale",
    image: "https://images.unsplash.com/photo-1632501641765-e568d28b0015?w=400",
    status: "active",
    views: 45,
    wishlistCount: 8,
  },
  {
    id: "2",
    title: "Splendor",
    price: 0,
    type: "trade",
    image: "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=400",
    status: "active",
    views: 32,
    wishlistCount: 5,
  },
  {
    id: "3",
    title: "Dixit",
    price: 18,
    type: "sale",
    image: "https://images.unsplash.com/photo-1566694271453-390536dd1f0d?w=400",
    status: "sold",
    views: 67,
    wishlistCount: 12,
  },
];

const MyGames = () => {
  const [games] = useState(mockMyGames);

  const activeGames = games.filter(g => g.status === "active");
  const soldGames = games.filter(g => g.status === "sold");

  return (
    <MainLayout showSearch={false}>
      <div className="container py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Gamepad2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Mes Jeux</h1>
              <p className="text-muted-foreground">{games.length} jeux publiés</p>
            </div>
          </div>
          <Button variant="gameswap" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Ajouter un jeu
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-card rounded-2xl border border-border p-4 text-center">
            <p className="text-3xl font-bold text-primary">{activeGames.length}</p>
            <p className="text-sm text-muted-foreground">Actifs</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4 text-center">
            <p className="text-3xl font-bold text-green-500">{soldGames.length}</p>
            <p className="text-sm text-muted-foreground">Vendus</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4 text-center">
            <p className="text-3xl font-bold">{games.reduce((acc, g) => acc + g.views, 0)}</p>
            <p className="text-sm text-muted-foreground">Vues totales</p>
          </div>
        </div>

        {/* Active Games */}
        <div className="mb-8">
          <h2 className="font-bold text-lg mb-4">Jeux en ligne</h2>
          <div className="space-y-3 animate-fade-in">
            {activeGames.map((game) => (
              <GameItem key={game.id} game={game} />
            ))}
          </div>
        </div>

        {/* Sold Games */}
        {soldGames.length > 0 && (
          <div>
            <h2 className="font-bold text-lg mb-4 text-muted-foreground">Vendus</h2>
            <div className="space-y-3 opacity-60">
              {soldGames.map((game) => (
                <GameItem key={game.id} game={game} />
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

const GameItem = ({ game }: { game: MyGame }) => {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 flex gap-4 items-center">
      <img
        src={game.image}
        alt={game.title}
        className="w-16 h-16 rounded-xl object-cover"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-bold">{game.title}</h3>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              game.type === "sale"
                ? "bg-primary/10 text-primary"
                : game.type === "trade"
                ? "bg-blue-500/10 text-blue-500"
                : "bg-purple-500/10 text-purple-500"
            }`}
          >
            {game.type === "sale" ? "Vente" : game.type === "trade" ? "Échange" : "Présentation"}
          </span>
          {game.status === "sold" && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
              Vendu
            </span>
          )}
        </div>
        {game.type === "sale" && (
          <p className="text-primary font-semibold">{game.price}€</p>
        )}
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {game.views}
          </span>
          <span>❤️ {game.wishlistCount}</span>
        </div>
      </div>
      <div className="flex gap-2">
        <button className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
          <Edit className="h-4 w-4" />
        </button>
        <button className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
          {game.status === "hidden" ? (
            <Eye className="h-4 w-4" />
          ) : (
            <EyeOff className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
};

export default MyGames;
