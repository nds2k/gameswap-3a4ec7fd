import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  CreditCard, Loader2, Banknote, Smartphone, ArrowLeft, 
  QrCode, AlertTriangle, CheckCircle, Copy, Share2 
} from "lucide-react";

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

type Step = "choose-method" | "cash-confirm" | "card-payment" | "payment-link";

export const SellGameModal = ({ open, onOpenChange, game, onSuccess }: SellGameModalProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("choose-method");
  const [loading, setLoading] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);

  const resetState = () => {
    setStep("choose-method");
    setLoading(false);
    setPaymentLink(null);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) resetState();
    onOpenChange(isOpen);
  };

  const handleCashPayment = async () => {
    if (!game) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-game-sale", {
        body: { gameId: game.id, method: "cash" },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
        toast({
          title: "Paiement des frais de service",
          description: "Payez les 5€ de frais pour enregistrer la vente.",
        });
        handleOpenChange(false);
        onSuccess?.();
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la transaction.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCardPayment = async () => {
    if (!game) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-game-sale", {
        body: { gameId: game.id, method: "card" },
      });

      if (error) throw error;
      if (data?.url) {
        setPaymentLink(data.url);
        setStep("payment-link");
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le lien de paiement.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (paymentLink) {
      await navigator.clipboard.writeText(paymentLink);
      toast({ title: "Lien copié !", description: "Envoyez-le à l'acheteur." });
    }
  };

  const shareLink = async () => {
    if (paymentLink && navigator.share) {
      await navigator.share({
        title: `Paiement pour ${game?.title}`,
        text: `Payez ${game?.price}€ pour "${game?.title}" sur GameSwap`,
        url: paymentLink,
      });
    } else {
      copyLink();
    }
  };

  if (!game) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Step: Choose Method */}
        {step === "choose-method" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Vendre "{game.title}"
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Game Preview */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                <img src={game.image} alt={game.title} className="w-16 h-16 rounded-lg object-cover" />
                <div>
                  <h3 className="font-semibold">{game.title}</h3>
                  <p className="text-2xl font-bold text-primary">{game.price}€</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground text-center">
                Comment l'acheteur va-t-il payer ?
              </p>

              {/* Cash Option */}
              <button
                onClick={() => setStep("cash-confirm")}
                className="w-full p-4 bg-card rounded-2xl border border-border hover:border-primary/50 transition-all flex items-center gap-4 text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Banknote className="h-6 w-6 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Espèces</p>
                  <p className="text-sm text-muted-foreground">En main propre · Frais de 0,99€</p>
                </div>
              </button>

              {/* Card Option */}
              <button
                onClick={handleCardPayment}
                disabled={loading}
                className="w-full p-4 bg-card rounded-2xl border border-border hover:border-primary/50 transition-all flex items-center gap-4 text-left disabled:opacity-50"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Carte / Apple Pay / Google Pay</p>
                  <p className="text-sm text-muted-foreground">Lien de paiement · Commission 7%</p>
                </div>
                {loading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
              </button>

              {/* Payment methods icons */}
              <div className="flex items-center justify-center gap-4 py-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>Visa/MC</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>Apple Pay</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>Google Pay</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Step: Cash Confirm */}
        {step === "cash-confirm" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-accent" />
                Vente en espèces
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <button
                onClick={() => setStep("choose-method")}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour
              </button>

              {/* Game info */}
              <div className="text-center p-6 bg-muted/50 rounded-2xl">
                <p className="text-sm text-muted-foreground mb-1">Vente de</p>
                <h3 className="font-bold text-lg">{game.title}</h3>
                <p className="text-3xl font-bold text-primary mt-2">{game.price}€</p>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-xl border border-destructive/20">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-sm">Frais de service : 0,99€</p>
                  <p className="text-sm text-muted-foreground">
                    Pour valider et enregistrer cette vente en espèces, des frais de service de 0,99€ s'appliquent. 
                    Ce montant sera prélevé par carte.
                  </p>
                </div>
              </div>

              <Button
                onClick={handleCashPayment}
                disabled={loading}
                variant="gameswap"
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Création du paiement...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Payer 0,99€ et enregistrer la vente
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Step: Payment Link Generated */}
        {step === "payment-link" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-primary" />
                Lien de paiement prêt
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Game + Price display */}
              <div className="text-center p-6 bg-primary/5 rounded-2xl border border-primary/20">
                <p className="text-sm text-muted-foreground mb-1">{game.title}</p>
                <p className="text-5xl font-bold text-primary">{game.price}€</p>
                <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Montant non modifiable
                </p>
              </div>

              <p className="text-sm text-muted-foreground text-center">
                Partagez ce lien avec l'acheteur pour qu'il effectue le paiement.
              </p>

              {/* Link actions */}
              <div className="flex gap-2">
                <Button onClick={copyLink} variant="outline" className="flex-1">
                  <Copy className="h-4 w-4 mr-2" />
                  Copier le lien
                </Button>
                <Button onClick={shareLink} variant="gameswap" className="flex-1">
                  <Share2 className="h-4 w-4 mr-2" />
                  Partager
                </Button>
              </div>

              {/* Open link directly */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  if (paymentLink) window.open(paymentLink, "_blank");
                }}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Ouvrir le lien de paiement
              </Button>

              {/* Info */}
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl text-xs text-muted-foreground">
                <Smartphone className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                  L'acheteur peut payer par carte, Apple Pay ou Google Pay. 
                  Le lien expire dans 15 minutes.
                </p>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
