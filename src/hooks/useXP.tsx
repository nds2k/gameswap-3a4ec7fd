import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getUserRank, getNextRank, getXPProgress, XP_BOOST_COSTS, type Rank } from "@/lib/xpSystem";

export interface XPState {
  xp: number;
  rank: Rank;
  nextRank: Rank | null;
  progressPercent: number;
  xpToNext: number | null;
}

export const useXP = (targetUserId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [xpState, setXPState] = useState<XPState | null>(null);
  const [loading, setLoading] = useState(true);

  const userId = targetUserId || user?.id;

  const fetchXP = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("xp")
        .eq("user_id", userId)
        .single();

      const xp = data?.xp ?? 0;
      const rank = getUserRank(xp);
      const nextRank = getNextRank(xp);
      const progressPercent = getXPProgress(xp);
      const xpToNext = nextRank ? nextRank.minXP - xp : null;

      setXPState({ xp, rank, nextRank, progressPercent, xpToNext });
    } catch (err) {
      console.error("Error fetching XP:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchXP();
  }, [fetchXP]);

  // Award XP to the current user
  const awardXP = useCallback(async (amount: number, reason: string) => {
    if (!user) return false;
    try {
      // Increment XP on profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("xp")
        .eq("user_id", user.id)
        .single();

      const currentXP = profile?.xp ?? 0;
      const newXP = currentXP + amount;

      await supabase
        .from("profiles")
        .update({ xp: newXP })
        .eq("user_id", user.id);

      // Log XP transaction
      await supabase.from("xp_transactions").insert({
        user_id: user.id,
        amount,
        reason,
      });

      await fetchXP();
      return true;
    } catch (err) {
      console.error("Error awarding XP:", err);
      return false;
    }
  }, [user, fetchXP]);

  // Spend XP to boost a listing
  const spendXPBoost = useCallback(async (gameId: string, boostType: "48H" | "7D") => {
    if (!user || !xpState) return false;
    const cost = XP_BOOST_COSTS[boostType];

    if (xpState.xp < cost) {
      toast({
        title: "XP insuffisant",
        description: `Il vous faut ${cost} XP pour ce boost. Vous en avez ${xpState.xp}.`,
        variant: "destructive",
      });
      return false;
    }

    try {
      // Deduct XP
      await supabase
        .from("profiles")
        .update({ xp: xpState.xp - cost })
        .eq("user_id", user.id);

      // Log deduction
      await supabase.from("xp_transactions").insert({
        user_id: user.id,
        amount: -cost,
        reason: `Boost XP ${boostType} pour annonce`,
      });

      // Calculate expiry
      const hours = boostType === "48H" ? 48 : 168;
      const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

      // Apply boost to listing
      await supabase
        .from("games")
        .update({
          is_boosted: true,
          boost_expires_at: expiresAt,
          boost_type: `XP_${boostType}`,
        })
        .eq("id", gameId)
        .eq("owner_id", user.id);

      await fetchXP();

      toast({
        title: "🚀 Boost activé !",
        description: `Votre annonce est boostée pendant ${boostType === "48H" ? "48 heures" : "7 jours"}.`,
      });
      return true;
    } catch (err) {
      console.error("Error spending XP boost:", err);
      toast({ title: "Erreur", description: "Impossible d'activer le boost", variant: "destructive" });
      return false;
    }
  }, [user, xpState, fetchXP, toast]);

  return { xpState, loading, fetchXP, awardXP, spendXPBoost };
};
