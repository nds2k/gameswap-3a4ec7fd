import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export const usewishlists = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [wishlistsIds, setwishlistsIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchwishlists = useCallback(async () => {
    if (!user) {
      setwishlistsIds(new Set());
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("wishlists")
        .select("game_id")
        .eq("user_id", user.id);

      if (error) throw error;

      setwishlistsIds(new Set(data?.map((item) => item.game_id) || []));
    } catch (error) {
      console.error("Error fetching wishlists:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchwishlists();
  }, [fetchwishlists]);

  const isInwishlists = useCallback(
    (gameId: string) => wishlistsIds.has(gameId),
    [wishlistsIds]
  );

  const togglewishlists = useCallback(
    async (gameId: string) => {
      if (!user) {
        toast({
          title: "Connexion requise",
          description: "Connectez-vous pour ajouter des jeux à votre wishlists",
          variant: "destructive",
        });
        return;
      }

      const isCurrentlywishlistsed = wishlistsIds.has(gameId);

      // Optimistic update
      setwishlistsIds((prev) => {
        const newSet = new Set(prev);
        if (isCurrentlywishlistsed) {
          newSet.delete(gameId);
        } else {
          newSet.add(gameId);
        }
        return newSet;
      });

      try {
        if (isCurrentlywishlistsed) {
          const { error } = await supabase
            .from("wishlists")
            .delete()
            .eq("user_id", user.id)
            .eq("game_id", gameId);

          if (error) throw error;

          toast({
            title: "Retiré de la wishlists",
            description: "Le jeu a été retiré de votre wishlists",
          });
        } else {
          const { error } = await supabase
            .from("wishlists")
            .insert({ user_id: user.id, game_id: gameId });

          if (error) throw error;

          toast({
            title: "Ajouté à la wishlists",
            description: "Le jeu a été ajouté à votre wishlists",
          });
        }
      } catch (error) {
        console.error("Error toggling wishlists:", error);
        // Revert optimistic update
        setwishlistsIds((prev) => {
          const newSet = new Set(prev);
          if (isCurrentlywishlistsed) {
            newSet.add(gameId);
          } else {
            newSet.delete(gameId);
          }
          return newSet;
        });

        toast({
          title: "Erreur",
          description: "Impossible de mettre à jour la wishlists",
          variant: "destructive",
        });
      }
    },
    [user, wishlistsIds, toast]
  );

  return {
    wishlistsIds,
    isInwishlists,
    togglewishlists,
    loading,
    refetch: fetchwishlists,
  };
};
