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

export interface UserReputation {
  averageRating: number;
  totalReviews: number;
  completedTrades: number;
  isVerified: boolean;
}

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
      const [{ data: ratings }, { count: tradesCount }] = await Promise.all([
        supabase.from("ratings").select("rating").eq("rated_user_id", userId),
        supabase.from("trades").select("*", { count: "exact", head: true })
          .eq("status", "completed")
          .or(`user1_id.eq.${userId},user2_id.eq.${userId}`),
      ]);

      const totalReviews = ratings?.length || 0;
      const completedTrades = tradesCount || 0;
      const averageRating = totalReviews > 0
        ? ratings!.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;
      const isVerified = completedTrades >= 3 && averageRating >= 4.0;

      return { averageRating, totalReviews, completedTrades, isVerified };
    } catch {
      return { averageRating: 0, totalReviews: 0, completedTrades: 0, isVerified: false };
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
