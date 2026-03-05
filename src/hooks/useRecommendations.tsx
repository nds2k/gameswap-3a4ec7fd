import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface RecommendedGame {
  id: string;
  title: string;
  image_url: string | null;
  price: number | null;
  game_type: string;
  category: string | null;
  owner_id: string;
  owner?: { full_name: string | null; avatar_url: string | null };
}

export const useRecommendations = (userId: string | undefined) => {
  const [recommendations, setRecommendations] = useState<RecommendedGame[]>([]);
  const [loading, setLoading] = useState(false);

  const trackInterest = useCallback(async (category: string) => {
    if (!userId || !category) return;
    try {
      // Try upsert - increment score
      const { data: existing } = await supabase
        .from("user_interests")
        .select("id, score")
        .eq("user_id", userId)
        .eq("category", category)
        .maybeSingle();

      if (existing) {
        await supabase.from("user_interests")
          .update({ score: existing.score + 0.5, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase.from("user_interests")
          .insert({ user_id: userId, category, score: 1.0 });
      }
    } catch (e) {
      console.error("Failed to track interest:", e);
    }
  }, [userId]);

  const fetchRecommendations = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // Get user interests sorted by score
      const { data: interests } = await supabase
        .from("user_interests")
        .select("category, score")
        .eq("user_id", userId)
        .order("score", { ascending: false })
        .limit(5);

      const topCategories = interests?.map(i => i.category) || [];

      // Get games matching user interests, excluding own games
      let query = supabase
        .from("games")
        .select("id, title, image_url, price, game_type, category, owner_id")
        .eq("status", "available")
        .neq("owner_id", userId)
        .limit(20);

      if (topCategories.length > 0) {
        query = query.in("category", topCategories);
      }

      const { data: games } = await query.order("created_at", { ascending: false });

      if (games && games.length > 0) {
        // Score and sort by interest relevance
        const scored = games.map(g => {
          const interest = interests?.find(i => i.category === g.category);
          return { ...g, relevance: interest?.score || 0 };
        });
        scored.sort((a, b) => b.relevance - a.relevance);
        setRecommendations(scored);
      } else {
        // Fallback: recent popular games
        const { data: fallback } = await supabase
          .from("games")
          .select("id, title, image_url, price, game_type, category, owner_id")
          .eq("status", "available")
          .neq("owner_id", userId)
          .order("view_count", { ascending: false })
          .limit(10);
        setRecommendations(fallback || []);
      }
    } catch (e) {
      console.error("Recommendations fetch failed:", e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  return { recommendations, loading, trackInterest, refetch: fetchRecommendations };
};
