import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Game {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  game_type: string;
  condition: string | null;
  image_url: string | null;
  owner_id: string;
  created_at: string;
  status: string | null;
  view_count: number | null;
  owner?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const useGames = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGames = useCallback(async () => {
    setLoading(true);
    try {
      const { data: gamesData, error } = await supabase
        .from("games")
        .select("*")
        .eq("status", "available")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch owner profiles for all games
      if (gamesData && gamesData.length > 0) {
        const ownerIds = [...new Set(gamesData.map((g) => g.owner_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", ownerIds);

        const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

        const gamesWithOwners = gamesData.map((game) => ({
          ...game,
          owner: profileMap.get(game.owner_id) || null,
        }));

        setGames(gamesWithOwners);
      } else {
        setGames([]);
      }
    } catch (error) {
      console.error("Error fetching games:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  return { games, loading, refetch: fetchGames };
};
