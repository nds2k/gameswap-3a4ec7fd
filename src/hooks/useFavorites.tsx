import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export const useFavorites = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    if (!user) { setFavoriteIds(new Set()); setLoading(false); return; }
    try {
      const { data, error } = await supabase.from("favorites").select("listing_id").eq("user_id", user.id);
      if (error) throw error;
      setFavoriteIds(new Set(data?.map(f => f.listing_id) || []));
    } catch (error) {
      console.error("Error fetching favorites:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchFavorites(); }, [fetchFavorites]);

  const isFavorite = useCallback((listingId: string) => favoriteIds.has(listingId), [favoriteIds]);

  const toggleFavorite = useCallback(async (listingId: string) => {
    if (!user) {
      toast({ title: "Connexion requise", description: "Connectez-vous pour ajouter aux favoris", variant: "destructive" });
      return;
    }

    const isCurrently = favoriteIds.has(listingId);
    setFavoriteIds(prev => {
      const next = new Set(prev);
      isCurrently ? next.delete(listingId) : next.add(listingId);
      return next;
    });

    try {
      if (isCurrently) {
        const { error } = await supabase.from("favorites").delete().eq("user_id", user.id).eq("listing_id", listingId);
        if (error) throw error;
        toast({ title: "Retiré des favoris" });
      } else {
        const { error } = await supabase.from("favorites").insert({ user_id: user.id, listing_id: listingId });
        if (error) throw error;
        toast({ title: "Ajouté aux favoris" });
      }
    } catch (error) {
      // Revert
      setFavoriteIds(prev => {
        const next = new Set(prev);
        isCurrently ? next.add(listingId) : next.delete(listingId);
        return next;
      });
      toast({ title: "Erreur", description: "Impossible de modifier les favoris", variant: "destructive" });
    }
  }, [user, favoriteIds, toast]);

  return { favoriteIds, isFavorite, toggleFavorite, loading, refetch: fetchFavorites };
};
