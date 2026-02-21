import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, User, MessageCircle, UserPlus, UserCheck, Clock, Star, Shield } from "lucide-react";
import { GameDetailModal } from "@/components/games/GameDetailModal";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";
import { OnlineStatusDot } from "@/components/chat/OnlineStatusDot";
import { useRatings } from "@/hooks/useRatings";
import { useXP } from "@/hooks/useXP";
import type { UserReputation } from "@/hooks/useRatings";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

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

const RANK_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  Bronze:   { label: "Bronze",   color: "text-amber-700",  bg: "bg-amber-700/10" },
  Silver:   { label: "Silver",   color: "text-slate-400",  bg: "bg-slate-400/10" },
  Gold:     { label: "Gold",     color: "text-yellow-500", bg: "bg-yellow-500/10" },
  Platinum: { label: "Platinum", color: "text-cyan-400",   bg: "bg-cyan-400/10" },
  Elite:    { label: "Elite",    color: "text-purple-400", bg: "bg-purple-400/10" },
};

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
  const [friendshipStatus, setFriendshipStatus] = useState<"none" | "pending_sent" | "pending_received" | "accepted">("none");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [reputation, setReputation] = useState<UserReputation | null>(null);

  const { xpState } = useXP(userId);
  const { getUserReputation } = useRatings();

  useEffect(() => {
    if (!userId) return;
    fetchPublicProfile();
    fetchUserGames();
    fetchFriendshipStatus();
    getUserReputation(userId).then(setReputation);
  }, [userId, user]);

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

  const fetchFriendshipStatus = async () => {
    if (!userId || !user || userId === user.id) return;
    try {
      const { data } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id, status")
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`)
        .maybeSingle();

      if (!data) {
        setFriendshipStatus("none");
      } else if (data.status === "accepted") {
        setFriendshipStatus("accepted");
      } else if (data.status === "pending") {
        setFriendshipStatus(data.requester_id === user.id ? "pending_sent" : "pending_received");
      } else {
        setFriendshipStatus("none");
      }
    } catch (error) {
      console.error("Error checking friendship:", error);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!user || !userId) return;
    setSendingRequest(true);
    try {
      const { error } = await supabase.from("friendships").insert({
        requester_id: user.id,
        addressee_id: userId,
      });
      if (error) throw error;
      setFriendshipStatus("pending_sent");
      toast.success("Demande d'ami envoyée !");
    } catch (error: any) {
      toast.error(error.message || "Impossible d'envoyer la demande");
    } finally {
      setSendingRequest(false);
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

          <div className="flex items-center gap-2 mt-4">
            <h1 className="text-2xl font-bold">
              {profile.full_name || "Utilisateur"}
            </h1>
            {!isOwnProfile && (
              <>
                {/* Add friend button */}
                {friendshipStatus === "none" && (
                  <button
                    onClick={handleSendFriendRequest}
                    disabled={sendingRequest}
                    className="p-1.5 rounded-full text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                    aria-label="Ajouter en ami"
                  >
                    {sendingRequest ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <UserPlus className="h-5 w-5" />
                    )}
                  </button>
                )}
                {friendshipStatus === "pending_sent" && (
                  <span className="p-1.5 rounded-full text-muted-foreground" title="Demande envoyée">
                    <Clock className="h-5 w-5" />
                  </span>
                )}
                {friendshipStatus === "accepted" && (
                  <span className="p-1.5 rounded-full text-green-500" title="Ami">
                    <UserCheck className="h-5 w-5" />
                  </span>
                )}
                <button
                  onClick={handleStartChat}
                  disabled={startingChat}
                  className="p-1.5 rounded-full text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                  aria-label="Envoyer un message"
                >
                  {startingChat ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <MessageCircle className="h-5 w-5" />
                  )}
                </button>
              </>
            )}
          </div>
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

          {/* Reputation Card */}
          <div className="mt-4 w-full max-w-sm bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-base">Réputation</h2>
                {reputation?.isVerified && <Shield className="h-4 w-4 text-green-500" />}
              </div>
              {xpState && (() => {
                const rs = RANK_STYLES[xpState.rank.name] ?? RANK_STYLES.Bronze;
                return (
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${rs.bg} ${rs.color} flex items-center gap-1`}>
                    {xpState.rank.emoji} {rs.label}
                  </span>
                );
              })()}
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

            {/* Score de réputation + progress bar */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Score de réputation</span>
                <span className="font-semibold">{reputation?.reputationScore ?? 0} pts</span>
              </div>
              <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min((reputation?.reputationScore ?? 0) / 200 * 100, 100)}%` }}
                />
              </div>
            </div>

            {reputation?.memberSince && (
              <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border flex items-center gap-1.5">
                📅 Membre depuis {format(new Date(reputation.memberSince), "MMMM yyyy", { locale: fr })}
              </p>
            )}
          </div>
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
