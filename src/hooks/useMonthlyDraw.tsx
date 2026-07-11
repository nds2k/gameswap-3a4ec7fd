import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface MonthlyReward {
  type: string;
  label: string;
  emoji: string;
  description: string;
}

const MONTHLY_REWARDS: MonthlyReward[] = [
  { type: "avatarAccessory", label: "Accessoire avatar", emoji: "✨", description: "Un accessoire aléatoire pour votre avatar" },
  { type: "postBoost", label: "Boost 12h", emoji: "🚀", description: "Boost de visibilité pendant 12 heures" },
  { type: "extraScans", label: "+1 Scan", emoji: "📸", description: "Un scan supplémentaire aujourd'hui" },
  { type: "temporaryXpBoost", label: "Boost XP +10%", emoji: "⚡", description: "Gagnez 10% de XP en plus pendant 7 jours" },
  { type: "merchCredit", label: "1€ merch", emoji: "👕", description: "1€ de crédit sur le merch GameSwapp" },
];

// 15% chance to get a badge with the monthly draw
const BADGE_CHANCE = 0.15;

export const useMonthlyDraw = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [drawing, setDrawing] = useState(false);
  const [lastReward, setLastReward] = useState<MonthlyReward | null>(null);
  const [hasDrawnThisMonth, setHasDrawnThisMonth] = useState<boolean | null>(null);

  const currentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  };

  const checkDrawStatus = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("monthly_draws")
      .select("id, reward_type, reward_data")
      .eq("user_id", user.id)
      .eq("month_year", currentMonth())
      .maybeSingle();

    if (data) {
      setHasDrawnThisMonth(true);
      const found = MONTHLY_REWARDS.find((r) => r.type === data.reward_type);
      if (found) setLastReward(found);
    } else {
      setHasDrawnThisMonth(false);
    }
  }, [user]);

  const performDraw = useCallback(async () => {
    if (!user || drawing) return null;
    setDrawing(true);
    try {
      // Double-check server-side
      const { data: existing } = await supabase
        .from("monthly_draws")
        .select("id")
        .eq("user_id", user.id)
        .eq("month_year", currentMonth())
        .maybeSingle();

      if (existing) {
        toast({ title: "Déjà tiré", description: "Vous avez déjà fait votre tirage ce mois-ci.", variant: "destructive" });
        setHasDrawnThisMonth(true);
        return null;
      }

      // Random reward
      const reward = MONTHLY_REWARDS[Math.floor(Math.random() * MONTHLY_REWARDS.length)];

      // Check if user also gets a badge
      const gotBadge = Math.random() < BADGE_CHANCE;

      const rewardData: Record<string, any> = { ...reward };
      if (gotBadge) {
        rewardData.bonusBadge = true;
        // Award the "Lucky Spinner" badge
        const { data: badges } = await supabase
          .from("badges")
          .select("id")
          .eq("name", "Lucky Spinner")
          .single();

        if (badges) {
          await supabase
            .from("user_badges")
            .upsert({ user_id: user.id, badge_id: badges.id }, { onConflict: "user_id,badge_id" });
        }
      }

      await supabase.from("monthly_draws").insert({
        user_id: user.id,
        reward_type: reward.type,
        reward_data: rewardData,
        month_year: currentMonth(),
      });

      setLastReward(reward);
      setHasDrawnThisMonth(true);

      toast({
        title: `${reward.emoji} ${reward.label}`,
        description: gotBadge
          ? `${reward.description} + Badge "Lucky Spinner" obtenu ! 🍀`
          : reward.description,
      });

      return { reward, gotBadge };
    } catch (err) {
      console.error("Error performing draw:", err);
      toast({ title: "Erreur", description: "Impossible d'effectuer le tirage", variant: "destructive" });
      return null;
    } finally {
      setDrawing(false);
    }
  }, [user, drawing, toast]);

  return { checkDrawStatus, performDraw, drawing, lastReward, hasDrawnThisMonth, MONTHLY_REWARDS };
};
