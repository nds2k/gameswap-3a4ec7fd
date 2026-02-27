import { useState, useEffect, useCallback, useRef } from "react";
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

// Cache profiles to avoid refetching on every game list load
let profilesCache: Map<string, { full_name: string | null; avatar_url: string | null }> | null = null;
let profilesCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const useGames = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const fetchGames = useCallback(async () => {
    setLoading(true);
    try {
      const { data: gamesData, error } = await supabase
        .from("games")
        .select("*")
        .eq("status", "available")
        .order("is_boosted", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!isMounted.current) return;

      if (gamesData && gamesData.length > 0) {
        const ownerIds = [...new Set(gamesData.map((g) => g.owner_id))];

        // Use cache if fresh enough
        const now = Date.now();
        if (!profilesCache || now - profilesCacheTime > CACHE_TTL) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name, avatar_url")
            .in("user_id", ownerIds);

          profilesCache = new Map(
            (profiles || []).map((p) => [p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url }])
          );
          profilesCacheTime = now;
        }

        if (!isMounted.current) return;

        const gamesWithOwners = gamesData.map((game) => ({
          ...game,
          owner: profilesCache?.get(game.owner_id) || null,
        }));

        setGames(gamesWithOwners);
      } else {
        setGames([]);
      }
    } catch (error) {
      console.error("Error fetching games:", error);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  return { games, loading, refetch: fetchGames };
};
