import { useState, useEffect, useRef, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Camera, ImageIcon, Loader2, X, ScanLine, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Html5Qrcode } from "html5-qrcode";

interface ScannedGame {
  name: string;
  publisher?: string | null;
  year?: number | null;
  image_url?: string | null;
  description?: string | null;
  category?: string | null;
  min_players?: number | null;
  max_players?: number | null;
  min_age?: number | null;
  play_time?: string | null;
  barcode: string;
}

const Scanner = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [scanning, setScanning] = useState(false);
  const [looking, setLooking] = useState(false);
  const [scannedGame, setScannedGame] = useState<ScannedGame | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);

  const startScanner = useCallback(async () => {
    if (cameraStarted) return;
    try {
      const scanner = new Html5Qrcode("scanner-region");
      scannerRef.current = scanner;
      
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 280, height: 150 }, aspectRatio: 1.777 },
        async (decodedText) => {
          // Barcode detected
          scanner.stop().catch(() => {});
          setCameraStarted(false);
          setScanning(false);
          await lookupBarcode(decodedText);
        },
        () => {} // ignore scan failures
      );
      setCameraStarted(true);
      setScanning(true);
    } catch (err: any) {
      console.error("Camera error:", err);
      if (err?.toString?.().includes("NotAllowed")) {
        setPermissionDenied(true);
      }
      toast({ title: "Erreur caméra", description: "Impossible d'accéder à la caméra", variant: "destructive" });
    }
  }, [cameraStarted]);

  const stopScanner = useCallback(() => {
    if (scannerRef.current && cameraStarted) {
      scannerRef.current.stop().catch(() => {});
      setCameraStarted(false);
      setScanning(false);
    }
  }, [cameraStarted]);

  useEffect(() => {
    return () => { stopScanner(); };
  }, []);

  const lookupBarcode = async (barcode: string) => {
    setLooking(true);
    try {
      const { data, error } = await supabase.functions.invoke("barcode-lookup", {
        body: { barcode },
      });
      if (error) throw error;
      if (data?.found && data.game) {
        setScannedGame({ ...data.game, barcode });
      } else {
        toast({ title: "Jeu non trouvé", description: `Aucun résultat pour le code ${barcode}` });
        setScannedGame(null);
      }
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message || "Erreur de recherche", variant: "destructive" });
    } finally {
      setLooking(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const scanner = new Html5Qrcode("scanner-region-hidden");
      const result = await scanner.scanFile(file, true);
      await lookupBarcode(result);
    } catch {
      toast({ title: "Code-barres non détecté", description: "Essayez avec une photo plus nette", variant: "destructive" });
    }
  };

  const handleUseForPost = () => {
    if (!scannedGame) return;
    // Navigate to home and pass scanned data via sessionStorage
    sessionStorage.setItem("scanned_game", JSON.stringify(scannedGame));
    navigate("/", { state: { openPostModal: true } });
  };

  return (
    <MainLayout showSearch={false}>
      <div className="max-w-lg mx-auto px-4 pb-28">
        {/* Header */}
        <div className="flex items-center gap-3 pt-6 pb-4">
          <Button variant="ghost" size="icon" onClick={() => { stopScanner(); navigate(-1); }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Scanner</h1>
            <p className="text-xs text-muted-foreground">Scannez un code-barres de jeu de société</p>
          </div>
        </div>

        {/* Scanner area */}
        {!scannedGame && (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden border border-border bg-card aspect-video">
              <div id="scanner-region" className="w-full h-full" />
              
              {!scanning && !looking && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-card">
                  <ScanLine className="h-12 w-12 text-primary/60" />
                  <p className="text-sm text-muted-foreground text-center px-4">
                    {permissionDenied 
                      ? "Accès caméra refusé. Utilisez l'import photo."
                      : "Appuyez sur le bouton pour scanner"}
                  </p>
                </div>
              )}

              {looking && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card/90 backdrop-blur-sm">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Recherche en cours...</p>
                </div>
              )}

              {scanning && (
                <div className="absolute top-3 right-3 z-10">
                  <Button variant="ghost" size="icon" onClick={stopScanner} className="bg-card/80 backdrop-blur-sm rounded-full">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Hidden scanner for file upload */}
            <div id="scanner-region-hidden" className="hidden" />

            <div className="flex gap-3">
              <Button
                variant="gameswap"
                className="flex-1"
                onClick={startScanner}
                disabled={scanning || looking}
              >
                <Camera className="h-4 w-4 mr-2" />
                {scanning ? "Scan actif..." : "Scanner"}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => fileInputRef.current?.click()}
                disabled={looking}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Importer photo
              </Button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </div>
        )}

        {/* Scanned result */}
        {scannedGame && (
          <div className="space-y-4 animate-fade-in">
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              {scannedGame.image_url && (
                <img src={scannedGame.image_url} alt={scannedGame.name} className="w-full h-48 object-cover" />
              )}
              <div className="p-5 space-y-3">
                <h2 className="text-xl font-bold">{scannedGame.name}</h2>
                
                <div className="flex flex-wrap gap-2">
                  {scannedGame.publisher && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">{scannedGame.publisher}</span>
                  )}
                  {scannedGame.year && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">{scannedGame.year}</span>
                  )}
                  {scannedGame.min_age && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">{scannedGame.min_age}+</span>
                  )}
                </div>

                {(scannedGame.min_players || scannedGame.play_time) && (
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    {scannedGame.min_players && (
                      <span>👥 {scannedGame.min_players}{scannedGame.max_players ? `-${scannedGame.max_players}` : ""} joueurs</span>
                    )}
                    {scannedGame.play_time && <span>⏱ {scannedGame.play_time} min</span>}
                  </div>
                )}

                {scannedGame.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">{scannedGame.description}</p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setScannedGame(null); }}>
                Nouveau scan
              </Button>
              <Button variant="gameswap" className="flex-1" onClick={handleUseForPost}>
                Publier ce jeu
              </Button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Scanner;
