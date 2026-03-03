import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Camera, Loader2, AlertCircle, Check } from "lucide-react";
import { useBadges } from "@/hooks/useBadges";

interface ProfileEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  currentProfile: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    selected_badge_id?: string | null;
    last_username_change?: string | null;
  } | null;
}

export const ProfileEditModal = ({ open, onOpenChange, onSuccess, currentProfile }: ProfileEditModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { userBadges } = useBadges(user?.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const COOLDOWN_DAYS = 14;

  useEffect(() => {
    if (currentProfile && open) {
      setFullName(currentProfile.full_name || "");
      setUsername(currentProfile.username || "");
      setAvatarUrl(currentProfile.avatar_url || null);
      setSelectedBadgeId(currentProfile.selected_badge_id || null);
    }
  }, [currentProfile, open]);

  const lastChange = currentProfile?.last_username_change
    ? new Date(currentProfile.last_username_change)
    : null;
  const now = new Date();
  const daysSinceChange = lastChange
    ? Math.floor((now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24))
    : COOLDOWN_DAYS + 1;
  const canChangeUsername = daysSinceChange >= COOLDOWN_DAYS;
  const daysRemaining = COOLDOWN_DAYS - daysSinceChange;
  const usernameChanged = username !== (currentProfile?.username || "");

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      toast({ title: "Erreur", description: "Image invalide (max 5 Mo)", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;
      await supabase.storage.from("avatars").remove([fileName]);
      const { error } = await supabase.storage.from("avatars").upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
      const newUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      await supabase.from("profiles").update({ avatar_url: newUrl }).eq("user_id", user.id);
      setAvatarUrl(newUrl);
      toast({ title: "Photo mise à jour" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de mettre à jour la photo", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const updates: Record<string, unknown> = {
        full_name: fullName.trim() || null,
        selected_badge_id: selectedBadgeId,
      };

      if (usernameChanged) {
        if (!canChangeUsername) {
          toast({ title: "Erreur", description: `Vous pourrez changer votre pseudo dans ${daysRemaining} jour(s)`, variant: "destructive" });
          setSaving(false);
          return;
        }
        // Check availability
        const { data: available } = await supabase.rpc("is_username_available", { check_username: username.trim() });
        if (!available) {
          toast({ title: "Pseudo indisponible", description: "Ce pseudo est déjà pris", variant: "destructive" });
          setSaving(false);
          return;
        }
        updates.username = username.trim();
        updates.last_username_change = new Date().toISOString();
      }

      const { error } = await supabase.from("profiles").update(updates).eq("user_id", user.id);
      if (error) throw error;

      toast({ title: "Profil mis à jour" });
      onSuccess?.();
      onOpenChange(false);
    } catch {
      toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const displayName = fullName || username || "U";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Modifier le profil</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Avatar */}
          <div className="flex justify-center">
            <div className="relative">
              <Avatar className="h-20 w-20 border-2 border-border">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="text-xl">{displayName[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform"
              >
                {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
              </button>
            </div>
          </div>

          {/* Display Name */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Nom d'affichage</Label>
            <Input id="edit-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Votre nom" />
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-username">Pseudo</Label>
            <Input
              id="edit-username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              placeholder="pseudo"
              disabled={!canChangeUsername && !usernameChanged}
            />
            {!canChangeUsername && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3" />
                Modifiable dans {daysRemaining} jour(s)
              </p>
            )}
          </div>

          {/* Badge Selection */}
          {userBadges.length > 0 && (
            <div className="space-y-1.5">
              <Label>Badge affiché</Label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedBadgeId(null)}
                  className={`px-3 py-1.5 rounded-lg border text-xs transition-all ${!selectedBadgeId ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                >
                  Aucun
                </button>
                {userBadges.map((ub) => (
                  <button
                    key={ub.badge.id}
                    onClick={() => setSelectedBadgeId(ub.badge.id)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs transition-all ${selectedBadgeId === ub.badge.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                  >
                    <span>{ub.badge.emoji}</span>
                    <span>{ub.badge.name}</span>
                    {selectedBadgeId === ub.badge.id && <Check className="h-3 w-3" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button variant="gameswap" className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enregistrer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
