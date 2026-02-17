import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Rating {
  id: string;
  trade_id: string;
  rater_id: string;
  rated_user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export type LeagueTier = "bronze" | "silver" | "gold" | "platinum" | "diamond";

export interface UserReputation {
  averageRating: number;
  totalReviews: number;
  completedTrades: number;
  isVerified: boolean;
  reputationScore: number;
  league: LeagueTier;
  memberSince: string | null;
}

const LEAGUE_THRESHOLDS: { tier: LeagueTier; minScore: number }[] = [
  { tier: "diamond", minScore: 200 },
  { tier: "platinum", minScore: 100 },
  { tier: "gold", minScore: 50 },
  { tier: "silver", minScore: 20 },
  { tier: "bronze", minScore: 0 },
];

export const getLeague = (score: number): LeagueTier => {
  for (const t of LEAGUE_THRESHOLDS) {
    if (score >= t.minScore) return t.tier;
  }
  return "bronze";
};

export const LEAGUE_CONFIG: Record<LeagueTier, { label: string; emoji: string; color: string }> = {
  bronze: { label: "Bronze", emoji: "🥉", color: "text-amber-700" },
  silver: { label: "Argent", emoji: "🥈", color: "text-gray-400" },
  gold: { label: "Or", emoji: "🥇", color: "text-yellow-500" },
  platinum: { label: "Platine", emoji: "💎", color: "text-cyan-400" },
  diamond: { label: "Diamant", emoji: "👑", color: "text-violet-400" },
};

export const useRatings = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const submitRating = useCallback(async (tradeId: string, ratedUserId: string, rating: number, comment?: string) => {
    if (!user) return false;
    try {
      const { error } = await supabase.from("ratings").insert({
        trade_id: tradeId,
        rater_id: user.id,
        rated_user_id: ratedUserId,
        rating,
        comment: comment || null,
      });
      if (error) throw error;
      toast({ title: "Évaluation envoyée", description: "Merci pour votre retour !" });
      return true;
    } catch (error: any) {
      const msg = error.message?.includes("unique_rating_per_trade")
        ? "Vous avez déjà évalué cet échange"
        : error.message;
      toast({ title: "Erreur", description: msg, variant: "destructive" });
      return false;
    }
  }, [user, toast]);

  const getUserReputation = useCallback(async (userId: string): Promise<UserReputation> => {
    try {
      const [{ data: ratings }, { count: tradesCount }, { data: profileData }] = await Promise.all([
        supabase.from("ratings").select("rating").eq("rated_user_id", userId),
        supabase.from("trades").select("*", { count: "exact", head: true })
          .eq("status", "completed")
          .or(`user1_id.eq.${userId},user2_id.eq.${userId}`),
        supabase.rpc("get_public_profile", { target_user_id: userId }),
      ]);

      const totalReviews = ratings?.length || 0;
      const completedTrades = tradesCount || 0;
      const averageRating = totalReviews > 0
        ? ratings!.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;
      const isVerified = completedTrades >= 3 && averageRating >= 4.0;

      // Reputation score algorithm
      let reputationScore = 0;
      reputationScore += completedTrades * 10; // 10 pts per trade
      if (totalReviews > 0) {
        reputationScore += Math.round(averageRating * 2 * totalReviews); // rating bonus
      }
      // 5-star bonus
      const fiveStarCount = ratings?.filter(r => r.rating === 5).length || 0;
      reputationScore += fiveStarCount * 3;

      const league = getLeague(reputationScore);
      const memberSince = profileData?.[0]?.created_at || null;

      return { averageRating, totalReviews, completedTrades, isVerified, reputationScore, league, memberSince };
    } catch {
      return { averageRating: 0, totalReviews: 0, completedTrades: 0, isVerified: false, reputationScore: 0, league: "bronze", memberSince: null };
    }
  }, []);

  const hasRatedTrade = useCallback(async (tradeId: string): Promise<boolean> => {
    if (!user) return false;
    const { count } = await supabase.from("ratings").select("*", { count: "exact", head: true })
      .eq("trade_id", tradeId).eq("rater_id", user.id);
    return (count || 0) > 0;
  }, [user]);

  return { submitRating, getUserReputation, hasRatedTrade };
};