import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ExternalLink, Store, ShieldCheck, CreditCard, CheckCircle, ArrowRight } from "lucide-react";

interface SellerOnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const SellerOnboardingModal = ({ open, onOpenChange, onSuccess }: SellerOnboardingModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleConnectStripe = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-seller-account");

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Erreur inconnue");

      if (data.alreadyComplete) {
        toast({
          title: "Compte déjà actif",
          description: "Votre compte vendeur est déjà configuré.",
        });
        onOpenChange(false);
        onSuccess?.();
        return;
      }

      // Redirect to Stripe hosted onboarding
      if (data.onboardingUrl) {
        window.open(data.onboardingUrl, "_blank");
        toast({
          title: "Redirection vers Stripe",
          description: "Complétez votre vérification d'identité et ajoutez votre compte bancaire.",
        });
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.message || "Impossible de créer le compte vendeur",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            Devenir vendeur
          </DialogTitle>
          <DialogDescription>
            Connectez votre compte de paiement pour recevoir vos ventes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Security notice */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground">
              Vos informations sont sécurisées et traitées par Stripe, leader mondial des paiements.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {[
              { icon: CreditCard, label: "Connecter votre compte", desc: "Créez votre profil vendeur" },
              { icon: Store, label: "Ajouter un compte bancaire", desc: "IBAN pour recevoir vos paiements" },
              { icon: ShieldCheck, label: "Vérifier votre identité", desc: "Pièce d'identité requise" },
              { icon: CheckCircle, label: "Commencer à vendre", desc: "Recevez vos paiements automatiquement" },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <step.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{step.label}</p>
                  <p className="text-xs text-muted-foreground">{step.desc}</p>
                </div>
                {i < 3 && <ArrowRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />}
              </div>
            ))}
          </div>

          <Button
            onClick={handleConnectStripe}
            className="w-full"
            variant="gameswap"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Connexion en cours...
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4 mr-2" />
                Connecter mon compte de paiement
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Vous serez redirigé vers une page sécurisée Stripe pour compléter votre inscription.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
