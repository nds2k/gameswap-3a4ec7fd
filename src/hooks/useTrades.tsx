import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Trade {
  id: string;
  listing_id: string;
  user1_id: string;
  user2_id: string;
  status: string;
  user1_confirmed: boolean;
  user2_confirmed: boolean;
  created_at: string;
  completed_at: string | null;
  listing?: { title: string; image_url: string | null; price: number | null };
  other_user?: { full_name: string | null; avatar_url: string | null; user_id: string };
}

export const useTrades = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrades = useCallback(async () => {
    if (!user) { setTrades([]); setLoading(false); return; }

    try {
      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const listingIds = [...new Set(data.map(t => t.listing_id))];
        const otherUserIds = [...new Set(data.map(t => t.user1_id === user.id ? t.user2_id : t.user1_id))];

        const [{ data: listings }, { data: profiles }] = await Promise.all([
          supabase.from("games").select("id, title, image_url, price").in("id", listingIds),
          supabase.rpc("get_public_profiles"),
        ]);

        const listingMap = new Map((listings || []).map(l => [l.id, l]));
        const profileMap = new Map((profiles || []).filter((p: any) => otherUserIds.includes(p.user_id)).map((p: any) => [p.user_id, p]));

        setTrades(data.map(t => ({
          ...t,
          listing: listingMap.get(t.listing_id) || undefined,
          other_user: profileMap.get(t.user1_id === user.id ? t.user2_id : t.user1_id) || undefined,
        })));
      } else {
        setTrades([]);
      }
    } catch (error) {
      console.error("Error fetching trades:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchTrades(); }, [fetchTrades]);

  const createTrade = useCallback(async (listingId: string, otherUserId: string) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from("trades")
        .insert({ listing_id: listingId, user1_id: user.id, user2_id: otherUserId })
        .select()
        .single();
      if (error) throw error;
      await fetchTrades();
      toast({ title: "Échange créé", description: "L'échange a été initié avec succès" });
      return data;
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return null;
    }
  }, [user, fetchTrades, toast]);

  const confirmTrade = useCallback(async (tradeId: string) => {
    if (!user) return;
    try {
      const trade = trades.find(t => t.id === tradeId);
      if (!trade) throw new Error("Trade not found");

      const isUser1 = trade.user1_id === user.id;
      if ((isUser1 && trade.user1_confirmed) || (!isUser1 && trade.user2_confirmed)) {
        toast({ title: "Déjà confirmé", description: "Vous avez déjà confirmé cet échange" });
        return;
      }

      const updateField = isUser1 ? { user1_confirmed: true } : { user2_confirmed: true };
      const { error } = await supabase.from("trades").update(updateField).eq("id", tradeId);
      if (error) throw error;

      // Check if both confirmed
      const otherConfirmed = isUser1 ? trade.user2_confirmed : trade.user1_confirmed;
      if (otherConfirmed) {
        await supabase.from("trades").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", tradeId);
        toast({ title: "Échange terminé !", description: "Les deux parties ont confirmé. Vous pouvez maintenant évaluer." });
      } else {
        toast({ title: "Confirmation enregistrée", description: "En attente de la confirmation de l'autre partie." });
      }

      await fetchTrades();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  }, [user, trades, fetchTrades, toast]);

  return { trades, loading, createTrade, confirmTrade, refetch: fetchTrades };
};
