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
  is_boosted: boolean | null;
  boost_expires_at: string | null;
  boost_type: string | null;
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

      // Fetch owner profiles for all games using RPC for visibility
      if (gamesData && gamesData.length > 0) {
        const ownerIds = [...new Set(gamesData.map((g) => g.owner_id))];
        const { data: profiles } = await supabase.rpc("get_public_profiles");

        const profileMap = new Map(
          (profiles || [])
            .filter((p: any) => ownerIds.includes(p.user_id))
            .map((p: any) => [p.user_id, { user_id: p.user_id, full_name: p.full_name, avatar_url: p.avatar_url }])
        );

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
