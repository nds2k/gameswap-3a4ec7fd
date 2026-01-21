import { List, Plus, Lock, Globe } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";

interface GameList {
  id: string;
  title: string;
  description: string;
  gameCount: number;
  isPublic: boolean;
  coverImage: string;
}

const mockLists: GameList[] = [
  {
    id: "1",
    title: "Jeux pour 2 joueurs",
    description: "Mes jeux préférés pour jouer à deux",
    gameCount: 8,
    isPublic: true,
    coverImage: "https://images.unsplash.com/photo-1632501641765-e568d28b0015?w=400",
  },
  {
    id: "2",
    title: "Soirées jeux",
    description: "Pour les grandes tablées",
    gameCount: 12,
    isPublic: false,
    coverImage: "https://images.unsplash.com/photo-1606503153255-59d7088e26c4?w=400",
  },
  {
    id: "3",
    title: "À acheter",
    description: "Ma prochaine liste d'achats",
    gameCount: 5,
    isPublic: false,
    coverImage: "https://images.unsplash.com/photo-1611371805429-8b5c1b2c34ba?w=400",
  },
];

const Lists = () => {
  return (
    <MainLayout showSearch={false}>
      <div className="container py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <List className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Mes Listes</h1>
              <p className="text-muted-foreground">{mockLists.length} listes créées</p>
            </div>
          </div>
          <Button variant="gameswap" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Nouvelle liste
          </Button>
        </div>

        {/* Lists Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
          {mockLists.map((list) => (
            <div
              key={list.id}
              className="bg-card rounded-2xl border border-border overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1"
            >
              {/* Cover */}
              <div className="relative h-32 overflow-hidden">
                <img
                  src={list.coverImage}
                  alt={list.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="font-bold text-white text-lg">{list.title}</h3>
                </div>
                <div className="absolute top-3 right-3">
                  {list.isPublic ? (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs">
                      <Globe className="h-3 w-3" />
                      Public
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/30 backdrop-blur-sm text-white text-xs">
                      <Lock className="h-3 w-3" />
                      Privé
                    </span>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                  {list.description}
                </p>
                <span className="text-sm font-medium text-primary">
                  {list.gameCount} jeux
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default Lists;
