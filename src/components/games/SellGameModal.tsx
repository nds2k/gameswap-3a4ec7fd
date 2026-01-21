import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Search, CreditCard, Loader2, User, Mail, Euro, Smartphone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface SellGameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game: {
    id: string;
    title: string;
    price: number;
    image: string;
  } | null;
  onSuccess?: () => void;
}

interface BuyerProfile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

export const SellGameModal = ({ open, onOpenChange, game, onSuccess }: SellGameModalProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BuyerProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedBuyer, setSelectedBuyer] = useState<BuyerProfile | null>(null);
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [useCustomBuyer, setUseCustomBuyer] = useState(false);

  useEffect(() => {
    if (game) {
      setSalePrice(game.price?.toString() || "");
    }
  }, [game]);

  useEffect(() => {
    if (open) {
      setSelectedBuyer(null);
      setCustomEmail("");
      setCustomName("");
      setSearchQuery("");
      setSearchResults([]);
      setUseCustomBuyer(false);
    }
  }, [open]);

  const searchBuyers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      // Use security definer function for public profile access
      const { data, error } = await supabase.rpc("get_public_profiles");

      if (error) throw error;

      // Filter by search query and exclude current user
      const queryLower = query.toLowerCase();
      const filtered = (data || []).filter(
        (profile) =>
          profile.full_name?.toLowerCase().includes(queryLower) &&
          profile.user_id !== user?.id
      ).slice(0, 5);

      // Map to buyer profile format
      const results: BuyerProfile[] = filtered.map(profile => ({
        id: profile.id,
        full_name: profile.full_name,
        email: "", // Email not available for privacy
        avatar_url: profile.avatar_url,
      }));

      setSearchResults(results);
    } catch (error) {
      console.error("Error searching buyers:", error);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchQuery) {
        searchBuyers(searchQuery);
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleSell = async () => {
    if (!game) return;

    const price = parseFloat(salePrice);
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Prix invalide",
        description: "Veuillez entrer un prix valide.",
        variant: "destructive",
      });
      return;
    }

    const buyerEmail = useCustomBuyer ? customEmail : selectedBuyer?.email;
    const buyerName = useCustomBuyer ? customName : selectedBuyer?.full_name;

    if (!buyerEmail) {
      toast({
        title: "Acheteur requis",
        description: "Veuillez sélectionner un acheteur ou entrer un email.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-game-sale", {
        body: {
          gameId: game.id,
          gameTitle: game.title,
          price,
          buyerEmail,
          buyerName,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Open Stripe checkout in new tab
        window.open(data.url, "_blank");
        toast({
          title: "Lien de paiement créé",
          description: "Le lien de paiement a été ouvert dans un nouvel onglet.",
        });
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (error: any) {
      console.error("Error creating sale:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la vente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!game) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Vendre "{game.title}"
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Game Preview */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
            <img
              src={game.image}
              alt={game.title}
              className="w-16 h-16 rounded-lg object-cover"
            />
            <div>
              <h3 className="font-semibold">{game.title}</h3>
              <p className="text-sm text-muted-foreground">Prix suggéré: {game.price}€</p>
            </div>
          </div>

          {/* Sale Price */}
          <div className="space-y-2">
            <Label htmlFor="price" className="flex items-center gap-2">
              <Euro className="h-4 w-4" />
              Prix de vente
            </Label>
            <div className="relative">
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0.50"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                className="pr-8"
                placeholder="0.00"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
            </div>
          </div>

          {/* Buyer Selection */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Acheteur
            </Label>

            {/* Toggle between search and manual entry */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={!useCustomBuyer ? "default" : "outline"}
                size="sm"
                onClick={() => setUseCustomBuyer(false)}
                className="flex-1"
              >
                <Search className="h-4 w-4 mr-1" />
                Rechercher
              </Button>
              <Button
                type="button"
                variant={useCustomBuyer ? "default" : "outline"}
                size="sm"
                onClick={() => setUseCustomBuyer(true)}
                className="flex-1"
              >
                <Mail className="h-4 w-4 mr-1" />
                Email manuel
              </Button>
            </div>

            {!useCustomBuyer ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un utilisateur..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                  {searching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                  )}
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                    {searchResults.map((buyer) => (
                      <button
                        key={buyer.id}
                        type="button"
                        onClick={() => {
                          setSelectedBuyer(buyer);
                          setSearchQuery("");
                          setSearchResults([]);
                        }}
                        className="w-full p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
                      >
                        {buyer.avatar_url ? (
                          <img
                            src={buyer.avatar_url}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-xs font-semibold text-primary">
                              {(buyer.full_name || "?").charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{buyer.full_name || "Utilisateur"}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected Buyer */}
                {selectedBuyer && (
                  <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
                    {selectedBuyer.avatar_url ? (
                      <img
                        src={selectedBuyer.avatar_url}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {(selectedBuyer.full_name || "?").charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{selectedBuyer.full_name}</p>
                      <p className="text-xs text-muted-foreground">Acheteur sélectionné</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedBuyer(null)}
                    >
                      Changer
                    </Button>
                  </div>
                )}

                {/* Note about email requirement */}
                {selectedBuyer && (
                  <div className="space-y-2">
                    <Label htmlFor="buyerEmail" className="text-sm text-muted-foreground">
                      Email de l'acheteur (pour le paiement)
                    </Label>
                    <Input
                      id="buyerEmail"
                      type="email"
                      value={selectedBuyer.email}
                      onChange={(e) => setSelectedBuyer({ ...selectedBuyer, email: e.target.value })}
                      placeholder="email@exemple.com"
                      required
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="customName">Nom de l'acheteur</Label>
                  <Input
                    id="customName"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Jean Dupont"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customEmail">Email de l'acheteur *</Label>
                  <Input
                    id="customEmail"
                    type="email"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="email@exemple.com"
                    required
                  />
                </div>
              </div>
            )}
          </div>

          {/* Payment Methods Info */}
          <div className="flex items-center justify-center gap-4 py-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              <span>Carte</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Smartphone className="h-4 w-4" />
              <span>Apple Pay</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Smartphone className="h-4 w-4" />
              <span>Google Pay</span>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSell}
            disabled={loading || (!selectedBuyer?.email && !customEmail)}
            className="w-full"
            variant="gameswap"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Création du paiement...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Créer le lien de paiement ({salePrice}€)
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
