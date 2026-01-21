import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Camera, Upload, Loader2, User, Plus, Settings } from "lucide-react";
import { PostGameModal } from "@/components/games/PostGameModal";
import { GameDetailModal } from "@/components/games/GameDetailModal";
import { Link } from "react-router-dom";

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

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchProfile();
    fetchUserGames();
  }, [user, navigate]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, username, avatar_url")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setProfile(data);
      }
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
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une image",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erreur",
        description: "L'image ne doit pas dépasser 5 Mo",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      await supabase.storage.from("avatars").remove([fileName]);

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const newAvatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: newAvatarUrl })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setProfile((prev) => prev ? { ...prev, avatar_url: newAvatarUrl } : null);

      toast({
        title: "Photo mise à jour",
        description: "Votre photo de profil a été modifiée",
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la photo",
        variant: "destructive",
      });
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

  return (
    <MainLayout showSearch={false}>
      <div className="max-w-2xl mx-auto pb-24">
        {/* Profile Header */}
        <div className="flex flex-col items-center pt-6 pb-8">
          <div className="relative">
            <Avatar className="h-28 w-28 border-4 border-primary/20">
              <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || "Avatar"} />
              <AvatarFallback className="bg-primary/10 text-primary text-3xl">
                {profile?.full_name?.[0]?.toUpperCase() || <User className="h-12 w-12" />}
              </AvatarFallback>
            </Avatar>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-9 h-9 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </button>
          </div>

          <h1 className="text-2xl font-bold mt-4">{profile?.full_name || "Utilisateur"}</h1>
          {profile?.username && (
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
          )}

          <Link to="/settings" className="mt-4">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Paramètres
            </Button>
          </Link>
        </div>

        {/* User Posts */}
        <div className="px-4">
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
                  onClick={() => setSelectedGameId(game.id)}
                  className="bg-card rounded-xl border border-border overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1"
                >
                  <div className="aspect-square overflow-hidden bg-muted">
                    {game.image_url ? (
                      <img
                        src={game.image_url}
                        alt={game.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-3xl">🎲</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
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
        onSuccess={() => {
          setPostModalOpen(false);
          fetchUserGames();
        }}
      />

      <GameDetailModal
        gameId={selectedGameId}
        open={!!selectedGameId}
        onOpenChange={(open) => !open && setSelectedGameId(null)}
      />
    </MainLayout>
  );
};

export default Profile;
