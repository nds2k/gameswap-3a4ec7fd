import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { TrendingUp, Clock, Zap, Sparkles, Heart } from "lucide-react";
import { useGames, type Game } from "@/hooks/useGames";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import { GameDetailModal } from "@/components/games/GameDetailModal";

const GameCard = ({ game, isFav, onFavToggle, onClick }: {
  game: Game;
  isFav: boolean;
  onFavToggle: () => void;
  onClick: () => void;
}) => (
  <div className="game-card cursor-pointer group" onClick={onClick}>
    <div className="aspect-[4/3] overflow-hidden relative">
      {game.image_url ? (
        <img src={game.image_url} alt={game.title} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className="w-full h-full bg-muted flex items-center justify-center text-3xl">🎲</div>
      )}
      {/* Heart - top right */}
      <button
        onClick={(e) => { e.stopPropagation(); onFavToggle(); }}
        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-sm"
      >
        <Heart className={`h-4 w-4 ${isFav ? "fill-red-500 text-red-500" : "text-foreground"}`} />
      </button>
      {/* Type badge - bottom left */}
      <span className={`absolute bottom-2 left-2 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide ${
        game.game_type === "sale" ? "bg-primary text-primary-foreground" : "bg-[hsl(210,80%,55%)] text-white"
      }`}>
        {game.game_type === "sale" ? "Vente" : "Échange"}
      </span>
      {game.is_boosted && (
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-[hsl(45,100%,50%)] text-foreground text-[9px] font-bold flex items-center gap-0.5">
          <Zap className="h-2.5 w-2.5" /> Boost
        </div>
      )}
    </div>
    <div className="p-2.5">
      <h3 className="text-xs font-extrabold line-clamp-1 text-foreground">{game.title}</h3>
      <div className="flex items-center justify-between mt-1">
        {game.game_type === "sale" && game.price != null ? (
          <span className="text-sm font-black text-primary">{game.price}€</span>
        ) : (
          <span className="text-[10px] text-muted-foreground">Échange</span>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground mt-0.5">
        {game.condition && <span>{game.condition}</span>}
      </p>
      {game.owner && (
        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1 uppercase tracking-wide font-semibold">
          {game.owner.username || game.owner.full_name || "Vendeur"} <span className="font-normal">~2 km</span>
        </p>
      )}
    </div>
  </div>
);

const HorizontalSection = ({ title, icon: Icon, games, onGameClick, isFavorite, toggleFavorite }: {
  title: string;
  icon: React.ElementType;
  games: Game[];
  onGameClick: (id: string) => void;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
}) => {
  if (games.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-black uppercase tracking-wide">{title}</h2>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {games.map((g) => (
          <div key={g.id} className="shrink-0 w-40">
            <GameCard
              game={g}
              isFav={isFavorite(g.id)}
              onFavToggle={() => toggleFavorite(g.id)}
              onClick={() => onGameClick(g.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const Discover = () => {
  const navigate = useNavigate();
  const { games, loading } = useGames();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

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
      <div className="max-w-2xl mx-auto px-4 py-3 space-y-5">
        {/* Promo Banner */}
        <div className="rounded-2xl overflow-hidden flex h-28">
          <div className="flex-1 bg-[hsl(24,100%,50%)] flex flex-col justify-center px-4">
            <p className="text-white text-xs font-bold uppercase tracking-wide">GameSwap</p>
            <p className="text-white text-sm font-black mt-1 leading-tight">Découvrez nos astuces Jeux</p>
          </div>
          <div className="flex-1 bg-muted flex items-center justify-center text-4xl">
            🎲🃏♟️
          </div>
        </div>

        {loading ? (
          <div className="space-y-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                <div className="flex gap-2">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="w-40 shrink-0">
                      <div className="aspect-[4/3] bg-muted rounded-xl animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <HorizontalSection title="Tendances" icon={TrendingUp} games={trendingGames} onGameClick={setSelectedGameId} isFavorite={isFavorite} toggleFavorite={toggleFavorite} />
            {boostedGames.length > 0 && (
              <HorizontalSection title="À la une" icon={Sparkles} games={boostedGames} onGameClick={setSelectedGameId} isFavorite={isFavorite} toggleFavorite={toggleFavorite} />
            )}
            <HorizontalSection title="Récemment ajoutés" icon={Clock} games={recentGames} onGameClick={setSelectedGameId} isFavorite={isFavorite} toggleFavorite={toggleFavorite} />

            {/* All listings 2-col grid */}
            <div className="space-y-3">
              <h2 className="text-sm font-black uppercase tracking-wide px-1">Toutes les annonces</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
