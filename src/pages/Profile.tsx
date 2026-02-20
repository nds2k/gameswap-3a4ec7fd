import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Camera, Loader2, User, Settings, Star, ChevronRight, Shield } from "lucide-react";
import { Link, useNavigate as useNav } from "react-router-dom";
import { useXP } from "@/hooks/useXP";
import { useRatings } from "@/hooks/useRatings";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { UserReputation } from "@/hooks/useRatings";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
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
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [reputation, setReputation] = useState<UserReputation | null>(null);

  const { xpState } = useXP(user?.id);
  const { getUserReputation } = useRatings();

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    fetchProfile();
  }, [user, navigate]);

  useEffect(() => {
    if (user) {
      getUserReputation(user.id).then(setReputation);
    }
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
          {/* Avatar */}
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

          {/* Name */}
          <div className="text-center">
            <h1 className="text-xl font-semibold">{displayName}</h1>
            {profile?.username && profile.full_name && (
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            )}
          </div>

          {/* Rank badge — only gamification visible */}
          {xpState && (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${rankStyle.bg} ${rankStyle.color}`}>
              {rankStyle.label}
            </span>
          )}

          {/* Settings */}
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
              <h2 className="font-semibold text-base">Réputation</h2>
              {reputation?.isVerified && (
                <Shield className="h-4 w-4 text-green-500" />
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-xl font-bold">
                  {reputation && reputation.totalReviews > 0 ? reputation.averageRating.toFixed(1) : "—"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Note</p>
            </div>
            <div>
              <p className="text-xl font-bold mb-1">{reputation?.totalReviews ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Avis</p>
            </div>
            <div>
              <p className="text-xl font-bold mb-1">{reputation?.completedTrades ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Échanges</p>
            </div>
          </div>

          {reputation?.memberSince && (
            <p className="text-xs text-muted-foreground mt-5 pt-4 border-t border-border">
              Membre depuis {format(new Date(reputation.memberSince), "MMMM yyyy", { locale: fr })}
            </p>
          )}
        </button>
      </div>
    </MainLayout>
  );
};

export default Profile;
