import { useState, useRef, useEffect } from "react";
import { Camera, Image, Trash2, Loader2, Rocket, ScanLine } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BoostModal } from "@/components/games/BoostModal";
import { useNavigate } from "react-router-dom";

interface PostGameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface GameFormData {
  title: string;
  description: string;
  price: string;
  gameType: "sale" | "trade" | "showcase";
  condition: string;
  category: string;
  players: string;
  playtime: string;
  age: string;
}

const GAME_CATEGORIES = [
  { value: "strategy", labelFr: "Stratégie" },
  { value: "adventure", labelFr: "Aventure" },
  { value: "family", labelFr: "Famille" },
  { value: "party", labelFr: "Ambiance" },
  { value: "cooperative", labelFr: "Coopératif" },
  { value: "horror", labelFr: "Horreur" },
  { value: "fantasy", labelFr: "Fantastique" },
  { value: "scifi", labelFr: "Science-fiction" },
  { value: "war", labelFr: "Guerre" },
  { value: "cards", labelFr: "Cartes" },
  { value: "dice", labelFr: "Dés" },
  { value: "puzzle", labelFr: "Puzzle" },
  { value: "trivia", labelFr: "Culture générale" },
  { value: "rpg", labelFr: "Jeu de rôle" },
  { value: "other", labelFr: "Autre" },
];

// Map BGG/scanned categories to internal categories
const mapToInternalCategory = (cat?: string | null): string => {
  if (!cat) return "";
  const lower = cat.toLowerCase();
  const mapping: Record<string, string> = {
    "stratégie": "strategy", "strategy": "strategy",
    "aventure": "adventure", "adventure": "adventure",
    "famille": "family", "family": "family",
    "ambiance": "party", "party": "party",
    "coopératif": "cooperative", "cooperative": "cooperative", "co-op": "cooperative",
    "horreur": "horror", "horror": "horror",
    "fantastique": "fantasy", "fantasy": "fantasy",
    "science-fiction": "scifi", "sci-fi": "scifi",
    "guerre": "war", "war": "war", "wargame": "war",
    "cartes": "cards", "cards": "cards", "card game": "cards",
    "dés": "dice", "dice": "dice",
    "puzzle": "puzzle",
    "culture générale": "trivia", "trivia": "trivia",
    "jeu de rôle": "rpg", "rpg": "rpg", "role-playing": "rpg",
  };
  return mapping[lower] || "other";
};

export const PostGameModal = ({ open, onOpenChange, onSuccess }: PostGameModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [boostModalOpen, setBoostModalOpen] = useState(false);
  const [publishedGameId, setPublishedGameId] = useState<string | null>(null);
  const [scannedImageUrl, setScannedImageUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState<GameFormData>({
    title: "", description: "", price: "", gameType: "sale",
    condition: "", category: "", players: "", playtime: "", age: "",
  });

  // Check for scanned game data on open
  useEffect(() => {
    if (!open) return;
    const raw = sessionStorage.getItem("scanned_game");
    if (!raw) return;
    try {
      const scanned = JSON.parse(raw);
      sessionStorage.removeItem("scanned_game");
      setFormData((f) => ({
        ...f,
        title: scanned.name || f.title,
        category: mapToInternalCategory(scanned.category) || f.category,
        players: scanned.min_players
          ? scanned.max_players
            ? `${scanned.min_players}-${scanned.max_players}`
            : `${scanned.min_players}`
          : f.players,
        playtime: scanned.play_time || f.playtime,
        age: scanned.min_age ? String(scanned.min_age) : f.age,
        description: scanned.description || f.description,
      }));
      if (scanned.image_url) setScannedImageUrl(scanned.image_url);
    } catch { /* ignore */ }
  }, [open]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newImages = Array.from(files).slice(0, 5 - images.length).map((file) => ({
      file, preview: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...newImages].slice(0, 5));
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const handleScanBarcode = () => {
    onOpenChange(false);
    navigate("/scanner");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Erreur", description: "Vous devez être connecté", variant: "destructive" });
      return;
    }
    if (!formData.title.trim()) {
      toast({ title: "Erreur", description: "Le nom du jeu est requis", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const img of images) {
        const fileExt = img.file.name.split(".").pop();
        const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, img.file);
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
          uploadedUrls.push(urlData.publicUrl);
        }
      }

      // Use scanned image as fallback if no uploaded images
      const mainImage = uploadedUrls[0] || scannedImageUrl || null;

      const fullDescription = [
        formData.description,
        formData.players && `Joueurs: ${formData.players}`,
        formData.playtime && `Durée: ${formData.playtime}`,
        formData.age && `Âge: ${formData.age}+`,
      ].filter(Boolean).join("\n");

      const { data: gameData, error } = await supabase.from("games").insert({
        owner_id: user.id,
        title: formData.title.trim(),
        description: fullDescription,
        price: formData.gameType === "sale" ? parseFloat(formData.price) || 0 : null,
        game_type: formData.gameType,
        condition: formData.condition || null,
        category: formData.category || null,
        image_url: mainImage,
        status: "available",
      }).select().single();

      if (error) throw error;

      if (gameData && uploadedUrls.length > 0) {
        const imageRecords = uploadedUrls.map((url, i) => ({
          game_id: gameData.id, image_url: url, display_order: i,
        }));
        await supabase.from("game_images").insert(imageRecords);
      }

      toast({ title: "Succès", description: "Votre jeu a été publié" });

      if (gameData?.id) setPublishedGameId(gameData.id);
      onSuccess?.();

      setFormData({
        title: "", description: "", price: "", gameType: "sale",
        condition: "", category: "", players: "", playtime: "", age: "",
      });
      setImages([]);
      setScannedImageUrl(null);
      onOpenChange(false);
    } catch (error) {
      console.error("Error posting game:", error);
      toast({ title: "Erreur", description: "Impossible de publier le jeu", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const hasScannedData = !!formData.title && formData.title.length > 2;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Publier un jeu</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Images + Scan */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Photos (max 5)</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleScanBarcode} className="gap-1.5">
                  <ScanLine className="h-3.5 w-3.5" />
                  Scanner
                </Button>
              </div>

              {/* Scanned image preview */}
              {scannedImageUrl && images.length === 0 && (
                <div className="relative aspect-video rounded-xl overflow-hidden border border-primary/20 bg-muted">
                  <img src={scannedImageUrl} alt="Scanned" className="w-full h-full object-contain" />
                  <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                    Image scannée
                  </span>
                </div>
              )}

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {images.map((img, index) => (
                  <div key={index} className="relative aspect-square rounded-xl overflow-hidden group">
                    <img src={img.preview} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeImage(index)} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="h-5 w-5 text-white" />
                    </button>
                  </div>
                ))}
                {images.length < 5 && (
                  <div className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                        <Image className="h-5 w-5 text-muted-foreground" />
                      </button>
                      <button type="button" onClick={() => cameraInputRef.current?.click()} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                        <Camera className="h-5 w-5 text-muted-foreground" />
                      </button>
                    </div>
                    <span className="text-xs text-muted-foreground">Ajouter</span>
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageSelect} className="hidden" />
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Nom du jeu *</Label>
              <Input id="title" value={formData.title} onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))} placeholder="Ex: Catan, Ticket to Ride..." className={hasScannedData ? "border-primary/30 bg-primary/5" : ""} />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Catégorie *</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData((f) => ({ ...f, category: v }))}>
                <SelectTrigger className={formData.category ? "border-primary/30 bg-primary/5" : ""}><SelectValue placeholder="Sélectionner une catégorie" /></SelectTrigger>
                <SelectContent>
                  {GAME_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.labelFr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type & Price */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type d'annonce</Label>
                <Select value={formData.gameType} onValueChange={(v) => setFormData((f) => ({ ...f, gameType: v as GameFormData["gameType"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sale">Vente</SelectItem>
                    <SelectItem value="trade">Échange</SelectItem>
                    <SelectItem value="showcase">Présentation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.gameType === "sale" && (
                <div className="space-y-2">
                  <Label htmlFor="price">Prix (€)</Label>
                  <Input id="price" type="number" min="0" value={formData.price} onChange={(e) => setFormData((f) => ({ ...f, price: e.target.value }))} placeholder="25" />
                </div>
              )}
            </div>

            {/* Game Info */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="players">Joueurs</Label>
                <Input id="players" value={formData.players} onChange={(e) => setFormData((f) => ({ ...f, players: e.target.value }))} placeholder="2-4" className={formData.players ? "border-primary/30 bg-primary/5" : ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="playtime">Durée (min)</Label>
                <Input id="playtime" value={formData.playtime} onChange={(e) => setFormData((f) => ({ ...f, playtime: e.target.value }))} placeholder="60-90" className={formData.playtime ? "border-primary/30 bg-primary/5" : ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Âge min</Label>
                <Input id="age" type="number" min="0" value={formData.age} onChange={(e) => setFormData((f) => ({ ...f, age: e.target.value }))} placeholder="10" className={formData.age ? "border-primary/30 bg-primary/5" : ""} />
              </div>
            </div>

            {/* Condition */}
            <div className="space-y-2">
              <Label>État</Label>
              <Select value={formData.condition} onValueChange={(v) => setFormData((f) => ({ ...f, condition: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner l'état" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Comme neuf">Comme neuf</SelectItem>
                  <SelectItem value="Excellent">Excellent</SelectItem>
                  <SelectItem value="Très bon">Très bon</SelectItem>
                  <SelectItem value="Bon">Bon</SelectItem>
                  <SelectItem value="Correct">Correct</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={formData.description} onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))} placeholder="Décrivez votre jeu, son état, si des pièces manquent..." rows={4} />
            </div>

            {/* Boost CTA */}
            <div className="flex items-center gap-3 p-4 rounded-2xl border border-primary/20 bg-primary/5">
              <Rocket className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Booster la visibilité</p>
                <p className="text-xs text-muted-foreground">Apparaissez en tête des résultats</p>
              </div>
              <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => setBoostModalOpen(true)}>
                <Rocket className="h-3.5 w-3.5 mr-1" />
                Booster
              </Button>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button type="submit" variant="gameswap" className="flex-1" disabled={loading}>
                {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Publication...</>) : "Publier"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {publishedGameId && (
        <BoostModal open={boostModalOpen} onOpenChange={setBoostModalOpen} gameId={publishedGameId} gameTitle={formData.title || "votre annonce"} />
      )}
    </>
  );
};
