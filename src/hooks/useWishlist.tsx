import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export const useWishlist = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchWishlist = useCallback(async () => {
    if (!user) {
      setWishlistIds(new Set());
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("wishlist")
        .select("game_id")
        .eq("user_id", user.id);

      if (error) throw error;

      setWishlistIds(new Set(data?.map((item) => item.game_id) || []));
    } catch (error) {
      console.error("Error fetching wishlist:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const isInWishlist = useCallback(
    (gameId: string) => wishlistIds.has(gameId),
    [wishlistIds]
  );

  const toggleWishlist = useCallback(
    async (gameId: string) => {
      if (!user) {
        toast({
          title: "Connexion requise",
          description: "Connectez-vous pour ajouter des jeux à votre wishlist",
          variant: "destructive",
        });
        return;
      }

      const isCurrentlyWishlisted = wishlistIds.has(gameId);

      // Optimistic update
      setWishlistIds((prev) => {
        const newSet = new Set(prev);
        if (isCurrentlyWishlisted) {
          newSet.delete(gameId);
        } else {
          newSet.add(gameId);
        }
        return newSet;
      });

      try {
        if (isCurrentlyWishlisted) {
          const { error } = await supabase
            .from("wishlist")
            .delete()
            .eq("user_id", user.id)
            .eq("game_id", gameId);

          if (error) throw error;

          toast({
            title: "Retiré de la wishlist",
            description: "Le jeu a été retiré de votre wishlist",
          });
        } else {
          const { error } = await supabase
            .from("wishlist")
            .insert({ user_id: user.id, game_id: gameId });

          if (error) throw error;

          toast({
            title: "Ajouté à la wishlist",
            description: "Le jeu a été ajouté à votre wishlist",
          });
        }
      } catch (error) {
        console.error("Error toggling wishlist:", error);
        // Revert optimistic update
        setWishlistIds((prev) => {
          const newSet = new Set(prev);
          if (isCurrentlyWishlisted) {
            newSet.add(gameId);
          } else {
            newSet.delete(gameId);
          }
          return newSet;
        });

        toast({
          title: "Erreur",
          description: "Impossible de mettre à jour la wishlist",
          variant: "destructive",
        });
      }
    },
    [user, wishlistIds, toast]
  );

  return {
    wishlistIds,
    isInWishlist,
    toggleWishlist,
    loading,
    refetch: fetchWishlist,
  };
};
