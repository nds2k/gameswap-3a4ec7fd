import { Gamepad2, Plus, Edit, Eye, EyeOff, CreditCard, Loader2, Trash2 } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { SellGameModal } from "@/components/games/SellGameModal";
import { PostGameModal } from "@/components/games/PostGameModal";
import { SellerOnboardingModal } from "@/components/seller/SellerOnboardingModal";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSellerStatus } from "@/hooks/useSellerStatus";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MyGame {
  id: string;
  title: string;
  price: number | null;
  game_type: string;
  image_url: string | null;
  status: string;
  view_count: number;
  created_at: string;
}

const MyGames = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [games, setGames] = useState<MyGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [onboardingModalOpen, setOnboardingModalOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<MyGame | null>(null);
  const [deleteGameId, setDeleteGameId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { checkStatus, loading: sellerCheckLoading } = useSellerStatus();

  const fetchGames = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("games")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGames(data || []);
    } catch (error) {
      console.error("Error fetching games:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, [user]);

  // Handle sale success/cancel from URL params
  useEffect(() => {
    const saleStatus = searchParams.get("sale");
    if (saleStatus === "success") {
      const transactionId = searchParams.get("transaction");
      toast({
        title: "Paiement réussi !",
        description: "La transaction a été enregistrée avec succès.",
      });
      // Complete the transaction via edge function
      if (transactionId) {
        supabase.functions.invoke("complete-transaction", {
          body: { transactionId },
        }).then(() => fetchGames());
      }
      setSearchParams({});
    } else if (saleStatus === "cancelled") {
      toast({
        title: "Paiement annulé",
        description: "Le paiement a été annulé.",
        variant: "destructive",
      });
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, toast, user]);

  const handleSellClick = async (game: MyGame) => {
    try {
      const result = await checkStatus();
      if (result.hasAccount && result.onboardingComplete && result.chargesEnabled) {
        setSelectedGame(game);
        setSellModalOpen(true);
      } else {
        setSelectedGame(game);
        setOnboardingModalOpen(true);
      }
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteGame = async () => {
    if (!deleteGameId || !user) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("games")
        .delete()
        .eq("id", deleteGameId)
        .eq("owner_id", user.id);

      if (error) throw error;

      setGames((prev) => prev.filter((g) => g.id !== deleteGameId));
      toast({
        title: "Jeu supprimé",
        description: "Votre annonce a été supprimée.",
      });
    } catch (error) {
      console.error("Error deleting game:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le jeu.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteGameId(null);
    }
  };

  const toggleGameStatus = async (game: MyGame) => {
    const newStatus = game.status === "available" ? "hidden" : "available";
    try {
      const { error } = await supabase
        .from("games")
        .update({ status: newStatus })
        .eq("id", game.id)
        .eq("owner_id", user?.id);

      if (error) throw error;

      setGames((prev) =>
        prev.map((g) => (g.id === game.id ? { ...g, status: newStatus } : g))
      );
    } catch (error) {
      console.error("Error updating game status:", error);
    }
  };

  const activeGames = games.filter((g) => g.status === "available");
  const soldGames = games.filter((g) => g.status === "sold");
  const hiddenGames = games.filter((g) => g.status === "hidden");

  if (loading) {
    return (
      <MainLayout showSearch={false}>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showSearch={false}>
      <div className="container py-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Gamepad2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Mes Jeux</h1>
              <p className="text-muted-foreground">{games.length} jeux publiés</p>
            </div>
          </div>
          <Button variant="gameswap" size="sm" onClick={() => setPostModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Ajouter
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-card rounded-2xl border border-border p-4 text-center">
            <p className="text-3xl font-bold text-primary">{activeGames.length}</p>
            <p className="text-sm text-muted-foreground">Actifs</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4 text-center">
            <p className="text-3xl font-bold text-green-500">{soldGames.length}</p>
            <p className="text-sm text-muted-foreground">Vendus</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4 text-center">
            <p className="text-3xl font-bold">{games.reduce((acc, g) => acc + (g.view_count || 0), 0)}</p>
            <p className="text-sm text-muted-foreground">Vues</p>
          </div>
        </div>

        {/* Empty State */}
        {games.length === 0 && (
          <div className="text-center py-16">
            <Gamepad2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Aucun jeu publié</h3>
            <p className="text-muted-foreground mb-4">Publiez votre premier jeu à vendre ou échanger</p>
            <Button variant="gameswap" onClick={() => setPostModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Publier un jeu
            </Button>
          </div>
        )}

        {/* Active Games */}
        {activeGames.length > 0 && (
          <div className="mb-8">
            <h2 className="font-bold text-lg mb-4">Jeux en ligne</h2>
            <div className="space-y-3">
              {activeGames.map((game) => (
                <GameItem
                  key={game.id}
                  game={game}
                  onSellClick={() => handleSellClick(game)}
                  onToggleStatus={() => toggleGameStatus(game)}
                  onDelete={() => setDeleteGameId(game.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Hidden Games */}
        {hiddenGames.length > 0 && (
          <div className="mb-8">
            <h2 className="font-bold text-lg mb-4 text-muted-foreground">Masqués</h2>
            <div className="space-y-3 opacity-70">
              {hiddenGames.map((game) => (
                <GameItem
                  key={game.id}
                  game={game}
                  onToggleStatus={() => toggleGameStatus(game)}
                  onDelete={() => setDeleteGameId(game.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Sold Games */}
        {soldGames.length > 0 && (
          <div>
            <h2 className="font-bold text-lg mb-4 text-muted-foreground">Vendus</h2>
            <div className="space-y-3 opacity-60">
              {soldGames.map((game) => (
                <GameItem key={game.id} game={game} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sell Modal */}
      <SellGameModal
        open={sellModalOpen}
        onOpenChange={setSellModalOpen}
        game={selectedGame ? {
          id: selectedGame.id,
          title: selectedGame.title,
          price: selectedGame.price || 0,
          image: selectedGame.image_url || "/placeholder.svg",
        } : null}
        onSuccess={fetchGames}
      />

      {/* Post Game Modal */}
      <PostGameModal
        open={postModalOpen}
        onOpenChange={setPostModalOpen}
        onSuccess={fetchGames}
      />

      {/* Seller Onboarding Modal */}
      <SellerOnboardingModal
        open={onboardingModalOpen}
        onOpenChange={setOnboardingModalOpen}
        onSuccess={() => {
          setOnboardingModalOpen(false);
          toast({
            title: "Onboarding lancé",
            description: "Finalisez votre inscription Stripe, puis revenez vendre votre jeu.",
          });
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteGameId} onOpenChange={() => setDeleteGameId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce jeu ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le jeu sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGame}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

interface GameItemProps {
  game: MyGame;
  onSellClick?: () => void;
  onToggleStatus?: () => void;
  onDelete?: () => void;
}

const GameItem = ({ game, onSellClick, onToggleStatus, onDelete }: GameItemProps) => {
  const canSell = game.game_type === "sale" && game.status === "available";
  const isHidden = game.status === "hidden";
  const isSold = game.status === "sold";

  const typeLabels: Record<string, { label: string; className: string }> = {
    sale: { label: "Vente", className: "bg-primary/10 text-primary" },
    trade: { label: "Échange", className: "bg-blue-500/10 text-blue-500" },
    presentation: { label: "Présentation", className: "bg-purple-500/10 text-purple-500" },
  };

  const typeInfo = typeLabels[game.game_type] || typeLabels.presentation;

  return (
    <div className="bg-card rounded-2xl border border-border p-4 flex gap-4 items-center">
      <img
        src={game.image_url || "/placeholder.svg"}
        alt={game.title}
        className="w-16 h-16 rounded-xl object-cover"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h3 className="font-bold">{game.title}</h3>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeInfo.className}`}>
            {typeInfo.label}
          </span>
          {isSold && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
              Vendu
            </span>
          )}
          {isHidden && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
              Masqué
            </span>
          )}
        </div>
        {game.game_type === "sale" && game.price && (
          <p className="text-primary font-semibold">{game.price}€</p>
        )}
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {game.view_count || 0}
          </span>
        </div>
      </div>
      {!isSold && (
        <div className="flex gap-2">
          {canSell && onSellClick && (
            <button
              onClick={onSellClick}
              className="w-9 h-9 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center hover:bg-green-500/20 transition-colors"
              title="Vendre ce jeu"
            >
              <CreditCard className="h-4 w-4" />
            </button>
          )}
          {onToggleStatus && (
            <button
              onClick={onToggleStatus}
              className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
              title={isHidden ? "Afficher" : "Masquer"}
            >
              {isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="w-9 h-9 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors"
              title="Supprimer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MyGames;
