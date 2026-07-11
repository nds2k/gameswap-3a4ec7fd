import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Zap, Banknote, ArrowRight } from "lucide-react";

const BecomeSeller = () => {
  const navigate = useNavigate();

  const benefits = [
    { icon: ShieldCheck, label: "Paiements sécurisés", desc: "Vos transactions sont protégées de bout en bout" },
    { icon: Zap, label: "Vérification rapide", desc: "Complétez votre profil vendeur en moins de 2 minutes" },
    { icon: Banknote, label: "Virements automatiques", desc: "Recevez vos gains directement sur votre compte" },
  ];

  return (
    <MainLayout>
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-8 max-w-md mx-auto">
        {/* Progress */}
        <div className="w-full flex gap-1.5 mb-10">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i === 0 ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        {/* Hero */}
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
          <Banknote className="h-10 w-10 text-primary" />
        </div>

        <h1 className="text-2xl font-black font-nunito text-foreground text-center mb-2">
          Devenir vendeur
        </h1>
        <p className="text-muted-foreground text-center text-sm mb-8">
          Commencez à vendre en quelques minutes. Simple, rapide et sécurisé.
        </p>

        {/* Benefits */}
        <div className="w-full space-y-3 mb-10">
          {benefits.map((b, i) => (
            <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl bg-card border border-border">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <b.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{b.label}</p>
                <p className="text-xs text-muted-foreground">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Button
          onClick={() => navigate("/become-seller/info")}
          variant="gameswap"
          className="w-full h-12 text-base"
        >
          Commencer
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>

        <p className="text-xs text-muted-foreground text-center mt-4">
          En continuant, vous acceptez nos conditions de vente.
        </p>
      </div>
    </MainLayout>
  );
};

export default BecomeSeller;
