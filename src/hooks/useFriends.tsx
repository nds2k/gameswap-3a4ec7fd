import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  updated_at: string;
}

export interface FriendProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export interface FriendWithProfile extends Friendship {
  friend: FriendProfile;
}

export interface FriendGame {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  price: number | null;
  game_type: string;
  condition: string | null;
  status: string | null;
  created_at: string;
  owner_id: string;
  owner_username: string | null;
  owner_full_name: string | null;
  owner_avatar_url: string | null;
}

export const useFriends = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [pendingReceived, setPendingReceived] = useState<FriendWithProfile[]>([]);
  const [pendingSent, setPendingSent] = useState<FriendWithProfile[]>([]);
  const [friendsGames, setFriendsGames] = useState<FriendGame[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFriendships = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch all friendships involving the user
      const { data: friendships, error } = await supabase
        .from("friendships")
        .select("*")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (error) throw error;

      // Get all unique user IDs we need profiles for
      const userIds = new Set<string>();
      friendships?.forEach((f) => {
        userIds.add(f.requester_id);
        userIds.add(f.addressee_id);
      });
      userIds.delete(user.id);

      // Fetch profiles using the secure function
      const { data: profiles } = await supabase.rpc("get_public_profiles");

      const profileMap = new Map<string, FriendProfile>();
      profiles?.forEach((p) => {
        profileMap.set(p.user_id, {
          id: p.id,
          user_id: p.user_id,
          full_name: p.full_name,
          username: p.username,
          avatar_url: p.avatar_url,
        });
      });

      const accepted: FriendWithProfile[] = [];
      const received: FriendWithProfile[] = [];
      const sent: FriendWithProfile[] = [];

      friendships?.forEach((f) => {
        const friendId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
        const friendProfile = profileMap.get(friendId);
        
        if (!friendProfile) return;

        const friendWithProfile: FriendWithProfile = {
          ...f,
          status: f.status as "pending" | "accepted" | "rejected",
          friend: friendProfile,
        };

        if (f.status === "accepted") {
          accepted.push(friendWithProfile);
        } else if (f.status === "pending") {
          if (f.addressee_id === user.id) {
            received.push(friendWithProfile);
          } else {
            sent.push(friendWithProfile);
          }
        }
      });

      setFriends(accepted);
      setPendingReceived(received);
      setPendingSent(sent);
    } catch (error) {
      console.error("Error fetching friendships:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchFriendsGames = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.rpc("get_friends_games", {
        user_uuid: user.id,
      });

      if (error) throw error;
      setFriendsGames(data || []);
    } catch (error) {
      console.error("Error fetching friends games:", error);
    }
  }, [user]);

  const sendFriendRequest = async (addresseeId: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase.from("friendships").insert({
      requester_id: user.id,
      addressee_id: addresseeId,
    });

    if (!error) {
      await fetchFriendships();
    }

    return { error };
  };

  const respondToRequest = async (friendshipId: string, accept: boolean) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase
      .from("friendships")
      .update({ status: accept ? "accepted" : "rejected" })
      .eq("id", friendshipId);

    if (!error) {
      await fetchFriendships();
      if (accept) {
        await fetchFriendsGames();
      }
    }

    return { error };
  };

  const removeFriend = async (friendshipId: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", friendshipId);

    if (!error) {
      await fetchFriendships();
      await fetchFriendsGames();
    }

    return { error };
  };

  const checkUsernameAvailable = async (username: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc("is_username_available", {
      check_username: username,
    });
    
    if (error) {
      console.error("Error checking username:", error);
      return false;
    }
    
    return data ?? false;
  };

  useEffect(() => {
    if (user) {
      fetchFriendships();
      fetchFriendsGames();
    }
  }, [user, fetchFriendships, fetchFriendsGames]);

  return {
    friends,
    pendingReceived,
    pendingSent,
    friendsGames,
    loading,
    sendFriendRequest,
    respondToRequest,
    removeFriend,
    checkUsernameAvailable,
    refetch: fetchFriendships,
    refetchGames: fetchFriendsGames,
  };
};
