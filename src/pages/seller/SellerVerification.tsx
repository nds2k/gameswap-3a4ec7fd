import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState, useRef } from "react";
import { ArrowLeft, ArrowRight, Upload, Camera, CheckCircle, FileImage } from "lucide-react";

const SellerVerification = () => {
  const navigate = useNavigate();
  const idInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  const isValid = !!idFile && !!selfieFile;

  const handleContinue = () => {
    // Store file names for display; actual upload happens in final step
    sessionStorage.setItem("seller_verification", JSON.stringify({
      idFileName: idFile?.name,
      selfieFileName: selfieFile?.name,
    }));
    // Store files in memory via a global ref (sessionStorage can't hold files)
    (window as any).__sellerFiles = { idFile, selfieFile };
    navigate("/become-seller/payout");
  };

  return (
    <MainLayout>
      <div className="min-h-[80vh] flex flex-col px-4 py-6 max-w-md mx-auto">
        {/* Progress */}
        <div className="w-full flex gap-1.5 mb-6">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= 2 ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <button onClick={() => navigate("/become-seller/info")} className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>

        <h1 className="text-xl font-black font-nunito text-foreground mb-1">Vérification d'identité</h1>
        <p className="text-sm text-muted-foreground mb-6">Uploadez une pièce d'identité et un selfie pour valider votre compte.</p>

        <div className="space-y-4 flex-1">
          {/* ID Upload */}
          <div
            onClick={() => idInputRef.current?.click()}
            className={`flex items-center gap-4 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
              idFile ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
          >
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
              idFile ? "bg-primary/10" : "bg-muted"
            }`}>
              {idFile ? <CheckCircle className="h-6 w-6 text-primary" /> : <FileImage className="h-6 w-6 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Pièce d'identité</p>
              <p className="text-xs text-muted-foreground truncate">
                {idFile ? idFile.name : "CNI, passeport ou permis de conduire"}
              </p>
            </div>
            <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
          <input
            ref={idInputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => setIdFile(e.target.files?.[0] || null)}
          />

          {/* Selfie */}
          <div
            onClick={() => selfieInputRef.current?.click()}
            className={`flex items-center gap-4 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
              selfieFile ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
          >
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
              selfieFile ? "bg-primary/10" : "bg-muted"
            }`}>
              {selfieFile ? <CheckCircle className="h-6 w-6 text-primary" /> : <Camera className="h-6 w-6 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Selfie</p>
              <p className="text-xs text-muted-foreground truncate">
                {selfieFile ? selfieFile.name : "Photo de votre visage, bien éclairée"}
              </p>
            </div>
            <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
          <input
            ref={selfieInputRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={(e) => setSelfieFile(e.target.files?.[0] || null)}
          />

          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground">
              🔒 Vos documents sont chiffrés et utilisés uniquement pour la vérification. Ils ne sont jamais partagés.
            </p>
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

export default SellerVerification;
