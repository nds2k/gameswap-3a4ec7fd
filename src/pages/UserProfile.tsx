import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, User, MessageCircle } from "lucide-react";
import { GameDetailModal } from "@/components/games/GameDetailModal";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";
import { OnlineStatusDot } from "@/components/chat/OnlineStatusDot";

interface PublicProfile {
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

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isOnline } = useOnlinePresence();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [startingChat, setStartingChat] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetchPublicProfile();
    fetchUserGames();
  }, [userId]);

  const fetchPublicProfile = async () => {
    if (!userId) return;

    try {
      const { data: profileData } = await supabase.rpc("get_public_profile", {
        target_user_id: userId,
      });

      if (profileData && profileData.length > 0) {
        setProfile({
          user_id: profileData[0].user_id,
          full_name: profileData[0].full_name,
          username: profileData[0].username,
          avatar_url: profileData[0].avatar_url,
        });
      }
    } catch (error) {
      console.error("Error fetching public profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserGames = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("games")
        .select("id, title, image_url, price, game_type, created_at")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGames(data || []);
    } catch (error) {
      console.error("Error fetching user games:", error);
    }
  };

  const handleStartChat = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!userId || userId === user.id) return;

    setStartingChat(true);
    try {
      // Check if a 1-on-1 conversation already exists
      const { data: myConvos } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      const { data: theirConvos } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", userId);

      const myConvoIds = myConvos?.map((c) => c.conversation_id) || [];
      const theirConvoIds = theirConvos?.map((c) => c.conversation_id) || [];

      const commonConvoIds = myConvoIds.filter((id) => theirConvoIds.includes(id));

      // Find a non-group conversation
      for (const convoId of commonConvoIds) {
        const { data: convo } = await supabase
          .from("conversations")
          .select("is_group")
          .eq("id", convoId)
          .maybeSingle();

        if (convo && !convo.is_group) {
          navigate(`/chat/${convoId}`);
          return;
        }
      }

      // No existing conversation found, create a new one
      // We need to generate an ID client-side since RLS prevents reading back immediately
      const newConvoId = crypto.randomUUID();
      
      const { error: convoError } = await supabase
        .from("conversations")
        .insert({ id: newConvoId, is_group: false });

      if (convoError) throw convoError;

      // Add current user first (RLS requires this order)
      const { error: selfPartError } = await supabase.from("conversation_participants").insert({
        conversation_id: newConvoId,
        user_id: user.id,
      });

      if (selfPartError) throw selfPartError;

      // Then add the other user
      const { error: otherPartError } = await supabase.from("conversation_participants").insert({
        conversation_id: newConvoId,
        user_id: userId,
      });

      if (otherPartError) throw otherPartError;

      navigate(`/chat/${newConvoId}`);
    } catch (error) {
      console.error("Error starting chat:", error);
    } finally {
      setStartingChat(false);
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

  if (!profile) {
    return (
      <MainLayout showSearch={false}>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <User className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-xl font-semibold">Profil introuvable</h1>
          <p className="text-muted-foreground">Cet utilisateur n'existe pas.</p>
        </div>
      </MainLayout>
    );
  }

  const isOwnProfile = user?.id === userId;

  return (
    <MainLayout showSearch={false}>
      <div className="max-w-2xl mx-auto pb-24">
        {/* Profile Header */}
        <div className="flex flex-col items-center pt-6 pb-8">
          <div className="relative">
            <Avatar className="h-28 w-28 border-4 border-primary/20">
              <AvatarImage
                src={profile.avatar_url || undefined}
                alt={profile.full_name || "Avatar"}
              />
              <AvatarFallback className="bg-primary/10 text-primary text-3xl">
                {profile.full_name?.[0]?.toUpperCase() || profile.username?.[0]?.toUpperCase() || (
                  <User className="h-12 w-12" />
                )}
              </AvatarFallback>
            </Avatar>
            <OnlineStatusDot
              isOnline={isOnline(profile.user_id)}
              size="lg"
              className="absolute bottom-1 right-1"
            />
          </div>

          <h1 className="text-2xl font-bold mt-4">
            {profile.full_name || "Utilisateur"}
          </h1>
          {profile.username && (
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
          )}

          {/* Message button - only show if not own profile */}
          {!isOwnProfile && (
            <Button
              variant="gameswap"
              className="mt-4"
              onClick={handleStartChat}
              disabled={startingChat}
            >
              {startingChat ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <MessageCircle className="h-4 w-4 mr-2" />
              )}
              Envoyer un message
            </Button>
          )}
        </div>

        {/* User Publications */}
        <div className="px-4">
          <h2 className="text-lg font-semibold mb-4">Publications</h2>

          {games.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-card rounded-2xl border border-border">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <span className="text-3xl">🎲</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">Aucune publication</h3>
              <p className="text-muted-foreground">
                Cet utilisateur n'a pas encore publié de jeu
              </p>
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

      <GameDetailModal
        gameId={selectedGameId}
        open={!!selectedGameId}
        onOpenChange={(open) => !open && setSelectedGameId(null)}
      />
    </MainLayout>
  );
};

export default UserProfile;
