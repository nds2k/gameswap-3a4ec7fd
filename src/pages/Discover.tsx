import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Search, TrendingUp, Clock, Zap, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useGames, type Game } from "@/hooks/useGames";
import { useAuth } from "@/contexts/AuthContext";
import { GameDetailModal } from "@/components/games/GameDetailModal";

const GameMiniCard = ({ game, onClick }: { game: Game; onClick: () => void }) => (
  <div onClick={onClick} className="cursor-pointer shrink-0 w-36 sm:w-44">
    <div className="aspect-[3/4] rounded-xl overflow-hidden bg-muted relative">
      {game.image_url ? (
        <img src={game.image_url} alt={game.title} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-3xl">🎲</div>
      )}
      {game.is_boosted && (
        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center gap-0.5">
          <Zap className="h-2.5 w-2.5" /> Boost
        </div>
      )}
    </div>
    <div className="mt-1.5 px-0.5">
      <p className="text-xs font-semibold line-clamp-1">{game.title}</p>
      {game.game_type === "sale" && game.price != null && (
        <p className="text-xs font-bold text-primary">{game.price} €</p>
      )}
    </div>
  </div>
);

const HorizontalSection = ({ title, icon: Icon, games, onGameClick }: {
  title: string;
  icon: React.ElementType;
  games: Game[];
  onGameClick: (id: string) => void;
}) => {
  if (games.length === 0) return null;
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 px-1">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold">{title}</h2>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {games.map((g) => (
          <GameMiniCard key={g.id} game={g} onClick={() => onGameClick(g.id)} />
        ))}
      </div>
    </div>
  );
};

const Discover = () => {
  const navigate = useNavigate();
  const { games, loading } = useGames();
  const { user } = useAuth();
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  const handleGameClick = (id: string) => {
    setSelectedGameId(id);
  };

  const trendingGames = useMemo(() =>
    [...games].sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0)).slice(0, 10),
    [games]
  );

  const boostedGames = useMemo(() =>
    games.filter((g) => g.is_boosted).slice(0, 10),
    [games]
  );

  const recentGames = useMemo(() =>
    [...games].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10),
    [games]
  );

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
        {/* Search entry — navigates to Search page */}
        <div
          className="relative cursor-pointer"
          onClick={() => navigate("/search")}
        >
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <div className="w-full h-11 rounded-xl bg-card border border-border pl-10 pr-4 flex items-center text-sm text-muted-foreground">
            Rechercher un jeu...
          </div>
        </div>

        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2.5">
                <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                <div className="flex gap-2.5">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="w-36 shrink-0">
                      <div className="aspect-[3/4] bg-muted rounded-xl animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <HorizontalSection title="Tendances" icon={TrendingUp} games={trendingGames} onGameClick={handleGameClick} />
            {boostedGames.length > 0 && (
              <HorizontalSection title="À la une" icon={Sparkles} games={boostedGames} onGameClick={handleGameClick} />
            )}
            <HorizontalSection title="Récemment ajoutés" icon={Clock} games={recentGames} onGameClick={handleGameClick} />

            {/* All listings grid */}
            <div className="space-y-2.5">
              <h2 className="text-sm font-bold px-1">Toutes les annonces</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {games.map((game) => (
                  <div
                    key={game.id}
                    onClick={() => handleGameClick(game.id)}
                    className="game-card cursor-pointer"
                  >
                    <div className="aspect-[4/3] overflow-hidden relative">
                      {game.image_url ? (
                        <img src={game.image_url} alt={game.title} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center text-3xl">🎲</div>
                      )}
                      {game.is_boosted && (
                        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center gap-0.5">
                          <Zap className="h-2.5 w-2.5" />
                        </div>
                      )}
                      <span className={`absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        game.game_type === "sale" ? "bg-primary text-primary-foreground" : "bg-blue-500 text-white"
                      }`}>
                        {game.game_type === "sale" ? "Vente" : "Échange"}
                      </span>
                    </div>
                    <div className="p-2.5">
                      <h3 className="text-xs font-bold line-clamp-1">{game.title}</h3>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-muted-foreground">{game.condition || "Non spécifié"}</span>
                        {game.game_type === "sale" && game.price != null && (
                          <span className="text-xs font-bold text-primary">{game.price}€</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
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
