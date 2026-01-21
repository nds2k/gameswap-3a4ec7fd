import { useState, useRef } from "react";
import { X, Camera, Image, Plus, Trash2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  { value: "strategy", labelFr: "Stratégie", labelEn: "Strategy" },
  { value: "adventure", labelFr: "Aventure", labelEn: "Adventure" },
  { value: "family", labelFr: "Famille", labelEn: "Family" },
  { value: "party", labelFr: "Ambiance", labelEn: "Party" },
  { value: "cooperative", labelFr: "Coopératif", labelEn: "Cooperative" },
  { value: "horror", labelFr: "Horreur", labelEn: "Horror" },
  { value: "fantasy", labelFr: "Fantastique", labelEn: "Fantasy" },
  { value: "scifi", labelFr: "Science-fiction", labelEn: "Sci-Fi" },
  { value: "war", labelFr: "Guerre", labelEn: "War" },
  { value: "cards", labelFr: "Cartes", labelEn: "Cards" },
  { value: "dice", labelFr: "Dés", labelEn: "Dice" },
  { value: "puzzle", labelFr: "Puzzle", labelEn: "Puzzle" },
  { value: "trivia", labelFr: "Culture générale", labelEn: "Trivia" },
  { value: "rpg", labelFr: "Jeu de rôle", labelEn: "Role-playing" },
  { value: "other", labelFr: "Autre", labelEn: "Other" },
];

export const PostGameModal = ({ open, onOpenChange, onSuccess }: PostGameModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [formData, setFormData] = useState<GameFormData>({
    title: "",
    description: "",
    price: "",
    gameType: "sale",
    condition: "",
    category: "",
    players: "",
    playtime: "",
    age: "",
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages = Array.from(files).slice(0, 5 - images.length).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
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
      // Upload images first
      let imageUrl = null;
      if (images.length > 0) {
        const file = images[0].file;
        const fileExt = file.name.split(".").pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars") // Using avatars bucket for now, should create games bucket
          .upload(filePath, file);

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(filePath);
          imageUrl = urlData.publicUrl;
        }
      }

      // Build description with extra info
      const fullDescription = [
        formData.description,
        formData.players && `Joueurs: ${formData.players}`,
        formData.playtime && `Durée: ${formData.playtime}`,
        formData.age && `Âge: ${formData.age}+`,
      ]
        .filter(Boolean)
        .join("\n");

      // Insert game
      const { error } = await supabase.from("games").insert({
        owner_id: user.id,
        title: formData.title.trim(),
        description: fullDescription,
        price: formData.gameType === "sale" ? parseFloat(formData.price) || 0 : null,
        game_type: formData.gameType,
        condition: formData.condition || null,
        category: formData.category || null,
        image_url: imageUrl,
        status: "available",
      });

      if (error) throw error;

      toast({ title: "Succès", description: "Votre jeu a été publié" });
      onSuccess?.();
      onOpenChange(false);

      // Reset form
      setFormData({
        title: "",
        description: "",
        price: "",
        gameType: "sale",
        condition: "",
        category: "",
        players: "",
        playtime: "",
        age: "",
      });
      setImages([]);
    } catch (error) {
      console.error("Error posting game:", error);
      toast({ title: "Erreur", description: "Impossible de publier le jeu", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Publier un jeu</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Images */}
          <div className="space-y-3">
            <Label>Photos (max 5)</Label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {images.map((img, index) => (
                <div key={index} className="relative aspect-square rounded-xl overflow-hidden group">
                  <img src={img.preview} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-5 w-5 text-white" />
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <div className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                    >
                      <Image className="h-5 w-5 text-muted-foreground" />
                    </button>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                    >
                      <Camera className="h-5 w-5 text-muted-foreground" />
                    </button>
                  </div>
                  <span className="text-xs text-muted-foreground">Ajouter</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Nom du jeu *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
              placeholder="Ex: Catan, Ticket to Ride..."
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Catégorie *</Label>
            <Select
              value={formData.category}
              onValueChange={(v) => setFormData((f) => ({ ...f, category: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {GAME_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.labelFr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type & Price */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type d'annonce</Label>
              <Select
                value={formData.gameType}
                onValueChange={(v) => setFormData((f) => ({ ...f, gameType: v as GameFormData["gameType"] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
                <Input
                  id="price"
                  type="number"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData((f) => ({ ...f, price: e.target.value }))}
                  placeholder="25"
                />
              </div>
            )}
          </div>

          {/* Game Info */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="players">Joueurs</Label>
              <Input
                id="players"
                value={formData.players}
                onChange={(e) => setFormData((f) => ({ ...f, players: e.target.value }))}
                placeholder="2-4"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="playtime">Durée (min)</Label>
              <Input
                id="playtime"
                value={formData.playtime}
                onChange={(e) => setFormData((f) => ({ ...f, playtime: e.target.value }))}
                placeholder="60-90"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="age">Âge min</Label>
              <Input
                id="age"
                type="number"
                min="0"
                value={formData.age}
                onChange={(e) => setFormData((f) => ({ ...f, age: e.target.value }))}
                placeholder="10"
              />
            </div>
          </div>

          {/* Condition */}
          <div className="space-y-2">
            <Label>État</Label>
            <Select
              value={formData.condition}
              onValueChange={(v) => setFormData((f) => ({ ...f, condition: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner l'état" />
              </SelectTrigger>
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
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
              placeholder="Décrivez votre jeu, son état, si des pièces manquent..."
              rows={4}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="gameswap" className="flex-1" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Publication...
                </>
              ) : (
                "Publier"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
