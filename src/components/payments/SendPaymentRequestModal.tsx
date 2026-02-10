import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Send, Loader2, Search, CheckCircle, User, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SendPaymentRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  preselectedGameId?: string;
  preselectedBuyerId?: string;
}

interface GameOption {
  id: string;
  title: string;
  price: number;
  image_url: string | null;
}

interface FriendOption {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

type Step = "select-game" | "select-buyer" | "confirm";

export const SendPaymentRequestModal = ({
  open,
  onOpenChange,
  onSuccess,
  preselectedGameId,
  preselectedBuyerId,
}: SendPaymentRequestModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("select-game");
  const [loading, setLoading] = useState(false);
  const [games, setGames] = useState<GameOption[]>([]);
  const [friends, setFriends] = useState<FriendOption[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameOption | null>(null);
  const [selectedBuyer, setSelectedBuyer] = useState<FriendOption | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open || !user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch seller's available games for sale
        const { data: gamesData } = await supabase
          .from("games")
          .select("id, title, price, image_url")
          .eq("owner_id", user.id)
          .eq("game_type", "sale")
          .eq("status", "available")
          .not("price", "is", null);

        setGames((gamesData || []) as GameOption[]);

        if (preselectedGameId) {
          const g = (gamesData || []).find((g) => g.id === preselectedGameId);
          if (g) {
            setSelectedGame(g as GameOption);
            setStep("select-buyer");
          }
        }

        // Fetch friends
        const { data: friendships } = await supabase
          .from("friendships")
          .select("requester_id, addressee_id")
          .eq("status", "accepted")
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

        const friendIds = (friendships || []).map((f) =>
          f.requester_id === user.id ? f.addressee_id : f.requester_id
        );

        if (friendIds.length > 0) {
          const { data: profilesData } = await supabase.rpc("get_public_profiles");
          const friendProfiles = (profilesData || [])
            .filter((p: any) => friendIds.includes(p.user_id))
            .map((p: any) => ({
              user_id: p.user_id,
              full_name: p.full_name,
              avatar_url: p.avatar_url,
            }));
          setFriends(friendProfiles);

          if (preselectedBuyerId) {
            const b = friendProfiles.find((f: FriendOption) => f.user_id === preselectedBuyerId);
            if (b) {
              setSelectedBuyer(b);
              setStep("confirm");
            }
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [open, user]);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setStep("select-game");
      setSelectedGame(null);
      setSelectedBuyer(null);
      setSearchQuery("");
    }
    onOpenChange(isOpen);
  };

  const handleSend = async () => {
    if (!selectedGame || !selectedBuyer) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-payment-request", {
        body: { gameId: selectedGame.id, buyerId: selectedBuyer.user_id },
      });

      if (error) throw error;

      toast({
        title: "Demande envoyée !",
        description: `Demande de ${selectedGame.price}€ envoyée à ${selectedBuyer.full_name || "l'acheteur"}.`,
      });
      handleOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer la demande.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const filteredFriends = friends.filter((f) =>
    (f.full_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Step 1: Select game */}
        {step === "select-game" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                Envoyer une demande de paiement
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <p className="text-sm text-muted-foreground">Sélectionnez le jeu à vendre :</p>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : games.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  Aucun jeu en vente disponible.
                </p>
              ) : (
                games.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => {
                      setSelectedGame(game);
                      setStep("select-buyer");
                    }}
                    className="w-full p-3 bg-card rounded-xl border border-border hover:border-primary/50 transition-colors flex items-center gap-3 text-left"
                  >
                    {game.image_url && (
                      <img src={game.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold">{game.title}</p>
                    </div>
                    <p className="font-bold text-primary">{game.price}€</p>
                  </button>
                ))
              )}
            </div>
          </>
        )}

        {/* Step 2: Select buyer */}
        {step === "select-buyer" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Choisir l'acheteur
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-xl text-sm">
                <img
                  src={selectedGame?.image_url || "/placeholder.svg"}
                  alt=""
                  className="w-8 h-8 rounded-lg object-cover"
                />
                <span className="font-medium">{selectedGame?.title}</span>
                <span className="ml-auto font-bold text-primary">{selectedGame?.price}€</span>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un ami..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {filteredFriends.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">
                  {friends.length === 0
                    ? "Ajoutez des amis pour envoyer des demandes."
                    : "Aucun résultat."}
                </p>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {filteredFriends.map((friend) => (
                    <button
                      key={friend.user_id}
                      onClick={() => {
                        setSelectedBuyer(friend);
                        setStep("confirm");
                      }}
                      className="w-full p-3 rounded-xl hover:bg-muted/50 transition-colors flex items-center gap-3 text-left"
                    >
                      {friend.avatar_url ? (
                        <img src={friend.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="font-semibold text-primary">
                            {friend.full_name?.[0]?.toUpperCase() || "?"}
                          </span>
                        </div>
                      )}
                      <p className="font-medium">{friend.full_name || "Utilisateur"}</p>
                    </button>
                  ))}
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep("select-game")}
                className="w-full"
              >
                ← Retour
              </Button>
            </div>
          </>
        )}

        {/* Step 3: Confirm */}
        {step === "confirm" && selectedGame && selectedBuyer && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                Confirmer la demande
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Summary */}
              <div className="text-center p-6 bg-primary/5 rounded-2xl border border-primary/20">
                <p className="text-sm text-muted-foreground mb-1">{selectedGame.title}</p>
                <p className="text-4xl font-bold text-primary">{selectedGame.price}€</p>
                <p className="text-sm text-muted-foreground mt-2">
                  → {selectedBuyer.full_name || "Acheteur"}
                </p>
              </div>

              {/* Info */}
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>La demande expire dans 24 heures.</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>L'acheteur devra confirmer et payer via Stripe. Accepter ≠ Payer.</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep("select-buyer")}
                >
                  ← Retour
                </Button>
                <Button
                  variant="gameswap"
                  className="flex-1"
                  disabled={sending}
                  onClick={handleSend}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Envoyer
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
