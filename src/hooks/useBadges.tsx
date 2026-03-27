import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Badge {
  id: string;
  name: string;
  description: string;
  emoji: string;
  badge_type: string;
  rarity: string;
  criteria: Record<string, any>;
}

export interface UserBadge {
  id: string;
  badge_id: string;
  earned_at: string;
  badge: Badge;
}

export const useBadges = (targetUserId?: string) => {
  const { user } = useAuth();
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = targetUserId || user?.id;

  const fetchBadges = useCallback(async () => {
    setLoading(true);
    try {
      const { data: badges } = await supabase
        .from("badges")
        .select("*")
        .order("rarity");

      setAllBadges((badges as Badge[]) || []);

      if (userId) {
        const { data: earned } = await supabase
          .from("user_badges")
          .select("id, badge_id, earned_at")
          .eq("user_id", userId);

        if (earned && badges) {
          const mapped = earned.map((ub: any) => ({
            ...ub,
            badge: badges.find((b: any) => b.id === ub.badge_id)!,
          })).filter((ub: any) => ub.badge);
          setUserBadges(mapped);
        }
      }
    } catch (err) {
      console.error("Error fetching badges:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  const awardBadge = useCallback(async (badgeId: string) => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from("user_badges")
        .insert({ user_id: user.id, badge_id: badgeId });
      if (error && !error.message.includes("duplicate")) throw error;
      await fetchBadges();
      return true;
    } catch (err) {
      console.error("Error awarding badge:", err);
      return false;
    }
  }, [user, fetchBadges]);

  return { allBadges, userBadges, loading, fetchBadges, awardBadge };
};
