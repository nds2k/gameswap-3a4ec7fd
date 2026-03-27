import { useState, useEffect } from "react";
import { X, Heart, MapPin, MessageCircle, User, Users, Clock, Calendar, Loader2, CreditCard, Star, Edit2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useWishlist } from "@/hooks/useWishlist";
import { useNavigate } from "react-router-dom";
import { useMessages } from "@/hooks/useMessages";
import { useToast } from "@/hooks/use-toast";
import { SellGameModal } from "@/components/games/SellGameModal";
import { ImageGallery } from "@/components/games/ImageGallery";
import { UserReputation } from "@/components/trades/UserReputation";
import { useTrades } from "@/hooks/useTrades";
import { useSellerStatus } from "@/hooks/useSellerStatus";
import { SellerOnboardingModal } from "@/components/seller/SellerOnboardingModal";

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
  status: string | null;
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
  const { createTrade } = useTrades();

  const { checkStatus, loading: sellerCheckLoading } = useSellerStatus();

  const [game, setGame] = useState<Game | null>(null);
  const [owner, setOwner] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [onboardingModalOpen, setOnboardingModalOpen] = useState(false);
  const [gameImages, setGameImages] = useState<string[]>([]);
  const [tradeLoading, setTradeLoading] = useState(false);

  const canEdit = game && user?.id === game.owner_id && 
    (new Date().getTime() - new Date(game.created_at).getTime()) <= 30 * 24 * 60 * 60 * 1000;
  const editExpired = game && user?.id === game.owner_id && !canEdit;

  useEffect(() => {
    if (!gameId || !open) return;

    const fetchGame = async () => {
      setLoading(true);
      try {
        const { data: gameData, error: gameError } = await supabase
          .from("games")
          .select("*")
          .eq("id", gameId)
          .single();

        if (gameError) throw gameError;
        setGame(gameData);

        // Fetch additional images
        const { data: imagesData } = await supabase
          .from("game_images")
          .select("image_url")
          .eq("game_id", gameId)
          .order("display_order");

        const allImages: string[] = [];
        if (gameData.image_url) allImages.push(gameData.image_url);
        if (imagesData) {
          imagesData.forEach((i: any) => {
            // Deduplicate: don't add the cover image again
            if (i.image_url !== gameData.image_url) {
              allImages.push(i.image_url);
            }
          });
        }
        setGameImages(allImages);

        if (gameData.owner_id) {
          const { data: allProfiles } = await supabase.rpc("get_public_profiles");
          const ownerProfile = (allProfiles || []).find((p: any) => p.user_id === gameData.owner_id);
          if (ownerProfile) {
            setOwner({ full_name: ownerProfile.full_name, avatar_url: ownerProfile.avatar_url });
          }
        }

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

  const handleStartTrade = async () => {
    if (!user || !game) return;
    setTradeLoading(true);
    await createTrade(game.id, game.owner_id);
    setTradeLoading(false);
  };

  const handleSellClick = async () => {
    if (!user || !game) return;
    try {
      const result = await checkStatus();
      if (result.hasAccount && result.onboardingComplete && result.chargesEnabled) {
        setSellModalOpen(true);
      } else {
        setOnboardingModalOpen(true);
      }
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
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
            {/* Image Gallery */}
            <div className="relative aspect-video overflow-hidden">
              <ImageGallery images={gameImages} alt={game.title} />

              {/* Type badge — top-left */}
              <div className="absolute top-3 left-4 z-10">
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

              {/* Wishlist heart — top-right, left of close button */}
              <div className="absolute top-3 right-12 z-10">
                <button
                  onClick={() => toggleWishlist(game.id)}
                  className="w-9 h-9 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110"
                >
                  <Heart
                    className={`h-4 w-4 transition-colors ${
                      isInWishlist(game.id) ? "fill-destructive text-destructive" : "text-muted-foreground"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">{game.title}</h2>
                  {game.condition && <p className="text-muted-foreground mt-1">{game.condition}</p>}
                </div>
                {game.game_type === "sale" && game.price != null && (
                  <span className="text-2xl font-bold text-primary">{game.price}€</span>
                )}
              </div>

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

              {parseDescription(game.description).main && (
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{parseDescription(game.description).main}</p>
                </div>
              )}

              {/* Owner section with reputation */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl">
                  <div 
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => { onOpenChange(false); navigate(`/user/${game.owner_id}`); }}
                  >
                    {owner?.avatar_url ? (
                      <img src={owner.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-xl font-semibold text-primary">{owner?.full_name?.[0]?.toUpperCase() || "?"}</span>
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{owner?.full_name || "Vendeur"}</p>
                        <UserReputation userId={game.owner_id} compact />
                      </div>
                      <p className="text-sm text-muted-foreground">Voir le profil</p>
                    </div>
                  </div>
                  {game.owner_id !== user?.id && (
                    <Button variant="gameswap" onClick={handleStartChat} disabled={chatLoading}>
                      {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                        <><MessageCircle className="h-4 w-4 mr-2" />Contacter</>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* Trade button for trade-type listings */}
              {game.game_type === "trade" && game.owner_id !== user?.id && user && (
                <Button variant="gameswap" size="lg" className="w-full" onClick={handleStartTrade} disabled={tradeLoading}>
                  {tradeLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Star className="h-4 w-4 mr-2" />}
                  Proposer un échange
                </Button>
              )}

              {/* Sell button */}
              {game.owner_id === user?.id && game.game_type === "sale" && game.status !== "sold" && (
                <Button variant="gameswap" size="lg" className="w-full mt-3" onClick={handleSellClick} disabled={sellerCheckLoading}>
                  {sellerCheckLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                  Vendre ce jeu
                </Button>
              )}

              {/* Edit expired message */}
              {editExpired && (
                <p className="text-sm text-muted-foreground text-center bg-muted/50 rounded-xl p-3">
                  ⏰ Période de modification expirée (30 jours après publication).
                </p>
              )}

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

      <SellGameModal
        open={sellModalOpen}
        onOpenChange={setSellModalOpen}
        game={game ? { id: game.id, title: game.title, price: game.price || 0, image: game.image_url || "/placeholder.svg" } : null}
        onSuccess={() => { onOpenChange(false); }}
      />

      <SellerOnboardingModal
        open={onboardingModalOpen}
        onOpenChange={setOnboardingModalOpen}
        onSuccess={() => {
          setOnboardingModalOpen(false);
          toast({
            title: "Onboarding lancé",
            description: "Finalisez votre inscription, puis revenez vendre votre jeu.",
          });
        }}
      />
    </Dialog>
  );
};
