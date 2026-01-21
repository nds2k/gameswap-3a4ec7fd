import { useState } from "react";
import { FriendGame } from "@/hooks/useFriends";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { GameDetailModal } from "@/components/games/GameDetailModal";

interface FriendsGamesProps {
  games: FriendGame[];
  loading: boolean;
}

const gameTypeLabels: Record<string, string> = {
  sale: "Vente",
  trade: "Échange",
  presentation: "Présentation",
};

export const FriendsGames = ({ games, loading }: FriendsGamesProps) => {
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Aucun jeu de vos amis pour le moment.</p>
        <p className="text-sm text-muted-foreground mt-1">
          Ajoutez des amis pour voir leurs annonces !
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {games.map((game) => (
          <div
            key={game.id}
            className="bg-card rounded-xl border border-border overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setSelectedGameId(game.id)}
          >
            <div className="aspect-[4/3] relative">
              {game.image_url ? (
                <img
                  src={game.image_url}
                  alt={game.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <span className="text-muted-foreground">Pas d'image</span>
                </div>
              )}
              <Badge className="absolute top-2 right-2 bg-background/90 text-foreground">
                {gameTypeLabels[game.game_type] || game.game_type}
              </Badge>
            </div>
            <div className="p-4">
              <h3 className="font-semibold truncate">{game.title}</h3>
              {game.price && (
                <p className="text-primary font-bold">{game.price}€</p>
              )}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={game.owner_avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {game.owner_full_name?.[0] || game.owner_username?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground truncate">
                  {game.owner_full_name || game.owner_username || "Ami"}
                </span>
              </div>
            </div>
          </div>
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
