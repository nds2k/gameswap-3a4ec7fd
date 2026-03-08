import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const COUNTRIES = [
  { value: "FR", label: "France" },
  { value: "BE", label: "Belgique" },
  { value: "CH", label: "Suisse" },
  { value: "LU", label: "Luxembourg" },
  { value: "DE", label: "Allemagne" },
  { value: "ES", label: "Espagne" },
  { value: "IT", label: "Italie" },
  { value: "NL", label: "Pays-Bas" },
  { value: "PT", label: "Portugal" },
];

const SellerInfo = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [country, setCountry] = useState("FR");
  const [email, setEmail] = useState(user?.email || "");

  const isValid = firstName.trim() && lastName.trim() && dob && country && email.trim();

  const handleContinue = () => {
    const data = { firstName, lastName, dob, country, email };
    sessionStorage.setItem("seller_info", JSON.stringify(data));
    navigate("/become-seller/verification");
  };

  return (
    <MainLayout>
      <div className="min-h-[80vh] flex flex-col px-4 py-6 max-w-md mx-auto">
        {/* Progress */}
        <div className="w-full flex gap-1.5 mb-6">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= 1 ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        {/* Back */}
        <button onClick={() => navigate("/become-seller")} className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>

        <h1 className="text-xl font-black font-nunito text-foreground mb-1">Informations personnelles</h1>
        <p className="text-sm text-muted-foreground mb-6">Ces informations sont nécessaires pour vérifier votre identité.</p>

        <div className="space-y-4 flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="firstName">Prénom</Label>
              <Input id="firstName" placeholder="Jean" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="lastName">Nom</Label>
              <Input id="lastName" placeholder="Dupont" value={lastName} onChange={(e) => setLastName(e.target.value)} className="mt-1" />
            </div>
          </div>

          <div>
            <Label htmlFor="dob">Date de naissance</Label>
            <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label>Pays</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="jean@exemple.fr" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
          </div>
        </div>

        <Button
          onClick={handleContinue}
          variant="gameswap"
          className="w-full h-12 text-base mt-8"
          disabled={!isValid}
        >
          Continuer
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </MainLayout>
  );
};

export default SellerInfo;
