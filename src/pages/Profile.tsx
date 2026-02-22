import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Camera, Loader2, User, Settings, Star, Shield, Plus, Trash2 } from "lucide-react";
import { useXP } from "@/hooks/useXP";
import { useRatings } from "@/hooks/useRatings";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { UserReputation } from "@/hooks/useRatings";
import { PostGameModal } from "@/components/games/PostGameModal";
import { GameDetailModal } from "@/components/games/GameDetailModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface Game {
  id: string;
  title: string;
  image_url: string | null;
  price: number | null;
  game_type: string;
  created_at: string;
}

const RANK_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  Bronze:   { label: "Bronze",   color: "text-amber-700",  bg: "bg-amber-700/10" },
  Silver:   { label: "Silver",   color: "text-slate-400",  bg: "bg-slate-400/10" },
  Gold:     { label: "Gold",     color: "text-yellow-500", bg: "bg-yellow-500/10" },
  Platinum: { label: "Platinum", color: "text-cyan-400",   bg: "bg-cyan-400/10" },
  Elite:    { label: "Elite",    color: "text-purple-400", bg: "bg-purple-400/10" },
};

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [reputation, setReputation] = useState<UserReputation | null>(null);
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [deleteGameId, setDeleteGameId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { xpState } = useXP(user?.id);
  const { getUserReputation } = useRatings();

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    fetchProfile();
    fetchUserGames();
  }, [user, navigate]);

  useEffect(() => {
    if (user) getUserReputation(user.id).then(setReputation);
  }, [user, getUserReputation]);

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, username, avatar_url")
        .eq("user_id", user.id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      if (data) setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserGames = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("games")
        .select("id, title, image_url, price, game_type, created_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setGames(data || []);
    } catch (error) {
      console.error("Error fetching games:", error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Erreur", description: "Veuillez sélectionner une image", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Erreur", description: "L'image ne doit pas dépasser 5 Mo", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;
      await supabase.storage.from("avatars").remove([fileName]);
      const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
      const newAvatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: newAvatarUrl }).eq("user_id", user.id);
      if (updateError) throw updateError;
      setProfile((prev) => prev ? { ...prev, avatar_url: newAvatarUrl } : null);
      toast({ title: "Photo mise à jour", description: "Votre photo de profil a été modifiée" });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({ title: "Erreur", description: "Impossible de mettre à jour la photo", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteGame = async () => {
    if (!user || !deleteGameId) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("games")
        .delete()
        .eq("id", deleteGameId)
        .eq("owner_id", user.id);
      if (error) throw error;
      setGames((prev) => prev.filter((g) => g.id !== deleteGameId));
      toast({ title: "Annonce supprimée", description: "Votre annonce a été supprimée avec succès" });
    } catch (error) {
      console.error("Error deleting game:", error);
      toast({ title: "Erreur", description: "Impossible de supprimer l'annonce", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteGameId(null);
    }
  };

  if (loading) {
    return (
      <MainLayout showSearch={false}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  const rankStyle = xpState ? (RANK_STYLES[xpState.rank.name] ?? RANK_STYLES.Bronze) : RANK_STYLES.Bronze;
  const displayName = profile?.full_name || profile?.username || "Utilisateur";

  return (
    <MainLayout showSearch={false}>
      <div className="max-w-md mx-auto pb-24 px-4">

        {/* Profile Header */}
        <div className="flex flex-col items-center pt-10 pb-8 gap-3">
          <div className="relative">
            <Avatar className="h-24 w-24 border-2 border-border">
              <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
              <AvatarFallback className="bg-muted text-muted-foreground text-2xl">
                {displayName[0]?.toUpperCase() || <User className="h-10 w-10" />}
              </AvatarFallback>
            </Avatar>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            </button>
          </div>

          <div className="text-center">
            <h1 className="text-xl font-semibold">{displayName}</h1>
            {profile?.username && profile.full_name && (
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            )}
          </div>


          <Link to="/settings">
            <Button variant="outline" size="sm" className="mt-1">
              <Settings className="h-4 w-4 mr-2" />
              Paramètres
            </Button>
          </Link>
        </div>

        {/* Reputation Card — clickable → analytics */}
        <button
          onClick={() => navigate("/profile/analytics")}
          className="w-full bg-card rounded-2xl border border-border p-6 text-left hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-base">Réputation</h2>
              {reputation?.isVerified && <Shield className="h-4 w-4 text-green-500" />}
            </div>
            {xpState && (
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${rankStyle.bg} ${rankStyle.color} flex items-center gap-1`}>
                {xpState.rank.emoji} {rankStyle.label}
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-xl font-bold">
                  {reputation && reputation.totalReviews > 0 ? reputation.averageRating.toFixed(1) : "—"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Note moyenne</p>
            </div>
            <div>
              <p className="text-xl font-bold mb-1">{reputation?.totalReviews ?? 0}</p>
              <p className="text-xs text-muted-foreground">Avis</p>
            </div>
            <div>
              <p className="text-xl font-bold mb-1">{reputation?.completedTrades ?? 0}</p>
              <p className="text-xs text-muted-foreground">Échanges</p>
            </div>
          </div>

          {/* XP Progress Bar — only visible to own profile */}
          {xpState && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground flex items-center gap-1">⚡ XP</span>
                <span className="font-semibold">{xpState.xp.toLocaleString()} XP</span>
              </div>
              <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${xpState.progressPercent}%` }}
                />
              </div>
              {xpState.nextRank && (
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  {xpState.xpToNext?.toLocaleString()} XP → {xpState.nextRank.emoji} {xpState.nextRank.name}
                </p>
              )}
            </div>
          )}

          {reputation?.memberSince && (
            <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border flex items-center gap-1.5">
              📅 Membre depuis {format(new Date(reputation.memberSince), "MMMM yyyy", { locale: fr })}
            </p>
          )}
        </button>

        {/* User Listings */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Mes annonces</h2>
            <Button variant="gameswap" size="sm" onClick={() => setPostModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Publier
            </Button>
          </div>

          {games.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-card rounded-2xl border border-border">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <span className="text-3xl">🎲</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">Aucune annonce</h3>
              <p className="text-muted-foreground mb-4">Publiez votre premier jeu</p>
              <Button variant="gameswap" onClick={() => setPostModalOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Publier un jeu
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {games.map((game) => (
                <div
                  key={game.id}
                  className="bg-card rounded-xl border border-border overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 relative group"
                >
                  <div
                    onClick={() => setSelectedGameId(game.id)}
                    className="aspect-square overflow-hidden bg-muted"
                  >
                    {game.image_url ? (
                      <img src={game.image_url} alt={game.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-3xl">🎲</span>
                      </div>
                    )}
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteGameId(game.id); }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-destructive/90 text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <div className="p-3" onClick={() => setSelectedGameId(game.id)}>
                    <h3 className="font-medium text-sm truncate">{game.title}</h3>
                    {game.game_type === "sale" && game.price != null && (
                      <p className="text-primary font-semibold text-sm">{game.price}€</p>
                    )}
                    {game.game_type !== "sale" && (
                      <span className="text-xs text-muted-foreground">
                        {game.game_type === "trade" ? "Échange" : "Présentation"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <PostGameModal
        open={postModalOpen}
        onOpenChange={setPostModalOpen}
        onSuccess={() => { setPostModalOpen(false); fetchUserGames(); }}
      />

      <GameDetailModal
        gameId={selectedGameId}
        open={!!selectedGameId}
        onOpenChange={(open) => !open && setSelectedGameId(null)}
      />

      <AlertDialog open={!!deleteGameId} onOpenChange={(open) => !open && setDeleteGameId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette annonce ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'annonce sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGame}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default Profile;
