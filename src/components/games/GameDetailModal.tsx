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
import { useRecommendations } from "@/hooks/useRecommendations";
import { MapContainer, TileLayer, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface Game {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  listing_type: string;
  condition: string | null;
  image_url: string | null;
  user_id: string;
  created_at: string;
  view_count: number | null;
  status: string | null;
}

interface RecommendedGame {
  id: string;
  title: string;
  price: number | null;
  listing_type: string;
  image_url?: string | null;
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
  const { recommendations, trackInterest } = useRecommendations(user?.id);

  const [game, setGame] = useState<Game | null>(null);
  const [owner, setOwner] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);
  const [ownerLocation, setOwnerLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [onboardingModalOpen, setOnboardingModalOpen] = useState(false);
  const [gameImages, setGameImages] = useState<string[]>([]);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [recImages, setRecImages] = useState<Map<string, string>>(new Map());

  const canEdit = game && user?.id === game.user_id &&
    (new Date().getTime() - new Date(game.created_at).getTime()) <= 30 * 24 * 60 * 60 * 1000;
  const editExpired = game && user?.id === game.user_id && !canEdit;

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

        // Track interest for recommendations
        if (gameData.category) trackInterest(gameData.category);

        // Fetch images from game_images table
        const { data: imagesData } = await supabase
          .from("game_images")
          .select("image_url")
          .eq("game_id", gameId)
          .order("display_order");

        const allImages: string[] = [];
        if (imagesData && imagesData.length > 0) {
          imagesData.forEach((i: any) => allImages.push(i.image_url));
        }
        if (allImages.length === 0 && gameData.image_url) allImages.push(gameData.image_url);
        setGameImages(allImages);

        // Fetch owner profile
        if (gameData.user_id) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name, avatar_url, location_lat, location_lng")
            .eq("id", gameData.user_id)
            .single();

          if (profileData) {
            setOwner({ full_name: profileData.full_name, avatar_url: profileData.avatar_url });
            if (profileData.location_lat && profileData.location_lng) {
              // Add random offset up to 15km (~0.135 degrees) for privacy
              const offset = () => (Math.random() - 0.5) * 0.27;
              setOwnerLocation({
                lat: profileData.location_lat + offset(),
                lng: profileData.location_lng + offset(),
              });
            }
          }
        }

        // Update view count
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

  // Fetch images for recommendations
  useEffect(() => {
    if (recommendations.length === 0) return;
    const fetchRecImages = async () => {
      const ids = recommendations.slice(0, 6).map(r => r.id);
      const { data } = await supabase
        .from("game_images")
        .select("game_id, image_url")
        .in("game_id", ids)
        .order("display_order");
      const map = new Map<string, string>();
      (data || []).forEach((img: any) => {
        if (!map.has(img.game_id)) map.set(img.game_id, img.image_url);
      });
      setRecImages(map);
    };
    fetchRecImages();
  }, [recommendations]);

  const handleStartChat = async () => {
    if (!user) {
      toast({ title: "Connexion requise", description: "Connectez-vous pour contacter le vendeur", variant: "destructive" });
      return;
    }
    if (!game || game.user_id === user.id) return;
    setChatLoading(true);
    try {
      const conversationId = await createConversation(game.user_id);
      if (conversationId) {
        onOpenChange(false);
        navigate("/messages");
      }
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de démarrer la conversation", variant: "destructive" });
    } finally {
      setChatLoading(false);
    }
  };

  const handleStartTrade = async () => {
    if (!user || !game) return;
    setTradeLoading(true);
    await createTrade(game.id, game.user_id);
    setTradeLoading(false);
  };

  const handleSellClick = async () => {
    if (!user || !game) return;
    try {
      const result = await checkStatus();
      if (result.hasAccount && result.onboardingComplete && result.chargesEnabled) {
        setSellModalOpen(true);
      } else {
        window.location.href = "https://gameswapp.com/become-seller";
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
              <div className="absolute top-3 left-4 z-10">
                <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                  game.listing_type === "vente"
                    ? "bg-primary text-primary-foreground"
                    : game.listing_type === "echange"
                    ? "bg-blue-500 text-white"
                    : "bg-purple-500 text-white"
                }`}>
                  {game.listing_type === "vente" ? "Vente" : game.listing_type === "echange" ? "Échange" : "Présentation"}
                </span>
              </div>
              <div className="absolute top-3 right-12 z-10">
                <button
                  onClick={() => toggleWishlist(game.id)}
                  className="w-9 h-9 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110"
                >
                  <Heart className={`h-4 w-4 transition-colors ${isInWishlist(game.id) ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
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
                {game.listing_type === "vente" && game.price != null && (
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
                        <Users className="h-4 w-4 text-muted-foreground" /><span>{players} joueurs</span>
                      </div>
                    )}
                    {playtime && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" /><span>{playtime} min</span>
                      </div>
                    )}
                    {age && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" /><span>{age}</span>
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

              {/* Owner */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl">
                <div
                  className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => { onOpenChange(false); navigate(`/user/${game.user_id}`); }}
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
                      <UserReputation userId={game.user_id} compact />
                    </div>
                    <p className="text-sm text-muted-foreground">Voir le profil</p>
                  </div>
                </div>
                {game.user_id !== user?.id && (
                  <Button variant="gameswap" onClick={handleStartChat} disabled={chatLoading}>
                    {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                      <><MessageCircle className="h-4 w-4 mr-2" />Contacter</>
                    )}
                  </Button>
                )}
              </div>

              {/* Map — approximate location */}
              {ownerLocation && (
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" /> Zone approximative
                  </h3>
                  <div className="rounded-2xl overflow-hidden border border-border/50" style={{ height: 200, zIndex: 0 }}>
                    <MapContainer
                      center={[ownerLocation.lat, ownerLocation.lng]}
                      zoom={11}
                      style={{ height: "100%", width: "100%" }}
                      zoomControl={false}
                      dragging={false}
                      scrollWheelZoom={false}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution=""
                      />
                      <Circle
                        center={[ownerLocation.lat, ownerLocation.lng]}
                        radius={15000}
                        pathOptions={{ color: "hsl(var(--primary))", fillColor: "hsl(var(--primary))", fillOpacity: 0.15, weight: 2 }}
                      />
                    </MapContainer>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">Localisation approximative dans un rayon de 15 km</p>
                </div>
              )}

              {/* Trade button */}
              {game.listing_type === "echange" && game.user_id !== user?.id && user && (
                <Button variant="gameswap" size="lg" className="w-full" onClick={handleStartTrade} disabled={tradeLoading}>
                  {tradeLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Star className="h-4 w-4 mr-2" />}
                  Proposer un échange
                </Button>
              )}

              {/* Sell button */}
              {game.user_id === user?.id && game.listing_type === "vente" && game.status !== "sold" && (
                <Button variant="gameswap" size="lg" className="w-full mt-3" onClick={handleSellClick} disabled={sellerCheckLoading}>
                  {sellerCheckLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                  Vendre ce jeu
                </Button>
              )}

              {editExpired && (
                <p className="text-sm text-muted-foreground text-center bg-muted/50 rounded-xl p-3">
                  ⏰ Période de modification expirée (30 jours après publication).
                </p>
              )}

              <p className="text-sm text-muted-foreground text-center">
                {game.view_count || 0} vue{(game.view_count || 0) > 1 ? "s" : ""}
              </p>

              {/* Recommendations */}
              {recommendations.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Recommandés pour vous</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {recommendations.slice(0, 6).map((rec) => (
                      <button
                        key={rec.id}
                        onClick={() => {
                          onOpenChange(false);
                          setTimeout(() => {
                            // Re-open with new game id via parent
                            window.dispatchEvent(new CustomEvent("open-game", { detail: rec.id }));
                          }, 300);
                        }}
                        className="text-left bg-card rounded-xl border border-border/50 overflow-hidden hover:border-primary/50 transition-colors"
                      >
                        <div className="aspect-[4/3] bg-muted overflow-hidden">
                          {recImages.get(rec.id) ? (
                            <img src={recImages.get(rec.id)} alt={rec.title} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl">🎲</div>
                          )}
                        </div>
                        <div className="p-1.5">
                          <p className="text-[10px] font-semibold line-clamp-1">{rec.title}</p>
                          {rec.listing_type === "vente" && rec.price != null && (
                            <p className="text-[10px] text-primary font-bold">{rec.price}€</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
          toast({ title: "Onboarding lancé", description: "Finalisez votre inscription, puis revenez vendre votre jeu." });
        }}
      />
    </Dialog>
  );
};
