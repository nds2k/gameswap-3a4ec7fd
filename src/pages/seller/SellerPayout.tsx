import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const SellerPayout = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [accountHolder, setAccountHolder] = useState("");
  const [iban, setIban] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [loading, setLoading] = useState(false);

  const isValid = accountHolder.trim() && iban.trim().length >= 15 && address.trim() && city.trim() && postalCode.trim();

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const infoStr = sessionStorage.getItem("seller_info");
      if (!infoStr) {
        toast({ title: "Erreur", description: "Informations manquantes. Veuillez recommencer.", variant: "destructive" });
        navigate("/become-seller");
        return;
      }

      const info = JSON.parse(infoStr);

      const { data, error } = await supabase.functions.invoke("create-seller-account", {
        body: {
          firstName: info.firstName,
          lastName: info.lastName,
          dob: info.dob,
          country: info.country,
          email: info.email,
          accountHolder,
          iban: iban.replace(/\s/g, ""),
          address,
          city,
          postalCode,
        },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Erreur lors de la création du compte");

      // Clean up session data
      sessionStorage.removeItem("seller_info");
      sessionStorage.removeItem("seller_verification");
      delete (window as any).__sellerFiles;

      navigate("/become-seller/success");
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

  // Format IBAN with spaces
  const handleIbanChange = (value: string) => {
    const cleaned = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const formatted = cleaned.match(/.{1,4}/g)?.join(" ") || cleaned;
    setIban(formatted);
  };

  return (
    <MainLayout>
      <div className="min-h-[80vh] flex flex-col px-4 py-6 max-w-md mx-auto">
        {/* Progress */}
        <div className="w-full flex gap-1.5 mb-6">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= 3 ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <button onClick={() => navigate("/become-seller/verification")} className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>

        <h1 className="text-xl font-black font-nunito text-foreground mb-1">Informations de paiement</h1>
        <p className="text-sm text-muted-foreground mb-6">Ajoutez votre compte bancaire pour recevoir vos paiements.</p>

        <div className="space-y-4 flex-1">
          <div>
            <Label htmlFor="holder">Titulaire du compte</Label>
            <Input id="holder" placeholder="Jean Dupont" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label htmlFor="iban">IBAN</Label>
            <Input
              id="iban"
              placeholder="FR76 1234 5678 9012 3456 7890 123"
              value={iban}
              onChange={(e) => handleIbanChange(e.target.value)}
              className="mt-1 font-mono text-sm"
              maxLength={42}
            />
          </div>

          <div>
            <Label htmlFor="address">Adresse</Label>
            <Input id="address" placeholder="12 rue de la Paix" value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="city">Ville</Label>
              <Input id="city" placeholder="Paris" value={city} onChange={(e) => setCity(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="postal">Code postal</Label>
              <Input id="postal" placeholder="75001" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className="mt-1" />
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground">
              Les paiements sont traités de manière sécurisée par Stripe. Vos données bancaires sont chiffrées.
            </p>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          variant="gameswap"
          className="w-full h-12 text-base mt-8"
          disabled={!isValid || loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Création du compte...
            </>
          ) : (
            "Valider et créer mon compte"
          )}
        </Button>
      </div>
    </MainLayout>
  );
};

export default SellerPayout;
