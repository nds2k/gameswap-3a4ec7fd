import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, ExternalLink, CreditCard, ShieldCheck } from "lucide-react";

interface SellerOnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const SellerOnboardingModal = ({ open, onOpenChange, onSuccess }: SellerOnboardingModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "redirect">("form");
  const [onboardingUrl, setOnboardingUrl] = useState("");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: user?.email || "",
    phone: "",
    iban: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName.trim()) newErrors.firstName = "Prénom requis";
    if (!formData.lastName.trim()) newErrors.lastName = "Nom requis";
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Email invalide";
    const cleanIban = formData.iban.replace(/\s/g, "");
    if (!cleanIban || cleanIban.length < 15 || cleanIban.length > 34) newErrors.iban = "IBAN invalide";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-seller-account", {
        body: formData,
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Erreur inconnue");

      setOnboardingUrl(data.onboardingUrl);
      setStep("redirect");

      toast({
        title: "Compte créé !",
        description: "Finalisez votre inscription sur la page suivante.",
      });
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenOnboarding = () => {
    window.open(onboardingUrl, "_blank");
    onOpenChange(false);
    onSuccess?.();
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setStep("form");
      setErrors({});
    }
    onOpenChange(isOpen);
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: "" }));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Devenir vendeur
          </DialogTitle>
          <DialogDescription>
            Créez votre compte vendeur pour recevoir des paiements
          </DialogDescription>
        </DialogHeader>

        {step === "form" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              <p className="text-xs text-muted-foreground">
                Vos informations sont sécurisées et traitées par Stripe, leader mondial des paiements.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">Prénom *</Label>
                <Input
                  id="firstName"
                  placeholder="Jean"
                  value={formData.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  className={errors.firstName ? "border-destructive" : ""}
                />
                {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Nom *</Label>
                <Input
                  id="lastName"
                  placeholder="Dupont"
                  value={formData.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  className={errors.lastName ? "border-destructive" : ""}
                />
                {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="jean@example.com"
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+33 6 12 34 56 78"
                value={formData.phone}
                onChange={(e) => updateField("phone", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="iban">IBAN *</Label>
              <Input
                id="iban"
                placeholder="FR76 1234 5678 9012 3456 7890 123"
                value={formData.iban}
                onChange={(e) => updateField("iban", e.target.value)}
                className={errors.iban ? "border-destructive" : ""}
              />
              {errors.iban && <p className="text-xs text-destructive">{errors.iban}</p>}
              <p className="text-xs text-muted-foreground">
                Votre IBAN pour recevoir vos paiements
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Création en cours...
                </>
              ) : (
                "Créer mon compte vendeur"
              )}
            </Button>
          </form>
        ) : (
          <div className="space-y-4 text-center py-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Compte créé avec succès !</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Cliquez ci-dessous pour finaliser votre vérification d'identité sur la page sécurisée Stripe.
              </p>
            </div>
            <Button onClick={handleOpenOnboarding} className="w-full">
              <ExternalLink className="h-4 w-4 mr-2" />
              Finaliser mon inscription
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
