import { useState, useEffect } from "react";
import { X, Heart, MapPin, MessageCircle, User, Users, Clock, Calendar, Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useWishlist } from "@/hooks/useWishlist";
import { useNavigate } from "react-router-dom";
import { useMessages } from "@/hooks/useMessages";
import { useToast } from "@/hooks/use-toast";

interface Game {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  game_type: string;
  condition: string | null;
  image_url: string | null;
  owner_id: string;
  created_at: string;
  view_count: number | null;
}

interface GameDetailModalProps {
  gameId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GameDetailModal = ({ gameId, open, onOpenChange }: GameDetailModalProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { createConversation } = useMessages();

  const [game, setGame] = useState<Game | null>(null);
  const [owner, setOwner] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    if (!gameId || !open) return;

    const fetchGame = async () => {
      setLoading(true);
      try {
        // Fetch game details
        const { data: gameData, error: gameError } = await supabase
          .from("games")
          .select("*")
          .eq("id", gameId)
          .single();

        if (gameError) throw gameError;
        setGame(gameData);

        // Fetch owner profile
        if (gameData.owner_id) {
          const { data: ownerData } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("user_id", gameData.owner_id)
            .single();

          setOwner(ownerData);
        }

        // Increment view count
        await supabase
          .from("games")
          .update({ view_count: (gameData.view_count || 0) + 1 })
          .eq("id", gameId);
      } catch (error) {
        console.error("Error fetching game:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
  }, [gameId, open]);

  const handleStartChat = async () => {
    if (!user) {
      toast({ title: "Connexion requise", description: "Connectez-vous pour contacter le vendeur", variant: "destructive" });
      return;
    }

    if (!game || game.owner_id === user.id) return;

    setChatLoading(true);
    try {
      const conversationId = await createConversation(game.owner_id);
      if (conversationId) {
        onOpenChange(false);
        navigate("/messages");
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast({ title: "Erreur", description: "Impossible de démarrer la conversation", variant: "destructive" });
    } finally {
      setChatLoading(false);
    }
  };

  const parseDescription = (desc: string | null) => {
    if (!desc) return { main: "", players: "", playtime: "", age: "" };

    const lines = desc.split("\n");
    const main = lines.filter((l) => !l.startsWith("Joueurs:") && !l.startsWith("Durée:") && !l.startsWith("Âge:")).join("\n");
    const players = lines.find((l) => l.startsWith("Joueurs:"))?.replace("Joueurs: ", "") || "";
    const playtime = lines.find((l) => l.startsWith("Durée:"))?.replace("Durée: ", "") || "";
    const age = lines.find((l) => l.startsWith("Âge:"))?.replace("Âge: ", "") || "";

    return { main, players, playtime, age };
  };

  if (!gameId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : game ? (
          <>
            {/* Image */}
            <div className="relative aspect-video overflow-hidden">
              {game.image_url ? (
                <img
                  src={game.image_url}
                  alt={game.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <span className="text-4xl">🎲</span>
                </div>
              )}

              {/* Type badge */}
              <div className="absolute top-4 left-4">
                <span
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
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

              {/* Wishlist button */}
              <button
                onClick={() => toggleWishlist(game.id)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110"
              >
                <Heart
                  className={`h-5 w-5 transition-colors ${
                    isInWishlist(game.id) ? "fill-destructive text-destructive" : "text-muted-foreground"
                  }`}
                />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">{game.title}</h2>
                  {game.condition && (
                    <p className="text-muted-foreground mt-1">{game.condition}</p>
                  )}
                </div>
                {game.game_type === "sale" && game.price != null && (
                  <span className="text-2xl font-bold text-primary">{game.price}€</span>
                )}
              </div>

              {/* Game info chips */}
              {(() => {
                const { players, playtime, age } = parseDescription(game.description);
                if (!players && !playtime && !age) return null;

                return (
                  <div className="flex flex-wrap gap-2">
                    {players && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{players} joueurs</span>
                      </div>
                    )}
                    {playtime && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{playtime} min</span>
                      </div>
                    )}
                    {age && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{age}</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Description */}
              {parseDescription(game.description).main && (
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {parseDescription(game.description).main}
                  </p>
                </div>
              )}

              {/* Owner */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl">
                <div className="flex items-center gap-3">
                  {owner?.avatar_url ? (
                    <img
                      src={owner.avatar_url}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{owner?.full_name || "Vendeur"}</p>
                    <p className="text-sm text-muted-foreground">Vendeur vérifié</p>
                  </div>
                </div>
                {game.owner_id !== user?.id && (
                  <Button variant="gameswap" onClick={handleStartChat} disabled={chatLoading}>
                    {chatLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Contacter
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* View count */}
              <p className="text-sm text-muted-foreground text-center">
                {game.view_count || 0} vue{(game.view_count || 0) > 1 ? "s" : ""}
              </p>
            </div>
          </>
        ) : (
          <div className="p-6 text-center">
            <p className="text-muted-foreground">Jeu introuvable</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
