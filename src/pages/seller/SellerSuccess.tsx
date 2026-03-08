import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Plus, ArrowRight } from "lucide-react";

const SellerSuccess = () => {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-8 max-w-md mx-auto text-center">
        {/* Progress */}
        <div className="w-full flex gap-1.5 mb-10">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-1 flex-1 rounded-full bg-primary" />
          ))}
        </div>

        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <CheckCircle className="h-10 w-10 text-primary" />
        </div>

        <h1 className="text-2xl font-black font-nunito text-foreground mb-2">
          Votre compte vendeur est prêt 🎉
        </h1>
        <p className="text-muted-foreground text-sm mb-8">
          Vous pouvez maintenant vendre vos jeux sur la plateforme. Vos paiements seront automatiquement versés sur votre compte bancaire.
        </p>

        <div className="w-full space-y-3">
          <Button
            onClick={() => navigate("/my-games")}
            variant="gameswap"
            className="w-full h-12 text-base"
          >
            <Plus className="h-4 w-4 mr-2" />
            Créer ma première annonce
          </Button>

          <Button
            onClick={() => navigate("/settings")}
            variant="outline"
            className="w-full h-12 text-base"
          >
            Retour aux paramètres
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default SellerSuccess;
