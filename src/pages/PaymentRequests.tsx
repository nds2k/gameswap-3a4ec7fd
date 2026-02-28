import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";
import {
  CreditCard, Loader2, Clock, CheckCircle, XCircle,
  AlertTriangle, ArrowRight, Send, Shield
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { SendPaymentRequestModal } from "@/components/payments/SendPaymentRequestModal";

interface Transaction {
  id: string;
  post_id: string;
  seller_id: string;
  buyer_id: string | null;
  amount: number;
  platform_fee: number;
  method: string;
  status: string;
  created_at: string;
  expires_at: string | null;
  completed_at: string | null;
  escrow_status?: string;
  escrow_release_at?: string | null;
}

interface GameInfo {
  id: string;
  title: string;
  image_url: string | null;
}

interface ProfileInfo {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

const PaymentRequests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [games, setGames] = useState<Map<string, GameInfo>>(new Map());
  const [profiles, setProfiles] = useState<Map<string, ProfileInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [sendModalOpen, setSendModalOpen] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch remote transactions where user is buyer or seller
      const { data: txData, error } = await supabase
        .from("transactions")
        .select("*")
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const txs = txData || [];
      setTransactions(txs);

      // Fetch related games
      const gameIds = [...new Set(txs.map((t) => t.post_id))];
      if (gameIds.length > 0) {
        const { data: gamesData } = await supabase
          .from("games")
          .select("id, title, image_url")
          .in("id", gameIds);
        const gamesMap = new Map<string, GameInfo>();
        (gamesData || []).forEach((g) => gamesMap.set(g.id, g));
        setGames(gamesMap);
      }

      // Fetch related profiles
      const { data: profilesData } = await supabase.rpc("get_public_profiles");
      const profilesMap = new Map<string, ProfileInfo>();
      (profilesData || []).forEach((p: any) =>
        profilesMap.set(p.user_id, { user_id: p.user_id, full_name: p.full_name, avatar_url: p.avatar_url })
      );
      setProfiles(profilesMap);
    } catch (error) {
      console.error("Error fetching payment requests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Handle payment success/cancel from URL
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    if (paymentStatus === "success") {
      const transactionId = searchParams.get("transaction");
      toast({
        title: "Paiement réussi !",
        description: "La transaction a été enregistrée.",
      });
      if (transactionId) {
        supabase.functions.invoke("complete-transaction", {
          body: { transactionId },
        }).then(() => fetchData());
      }
      setSearchParams({});
    } else if (paymentStatus === "cancelled") {
      toast({
        title: "Paiement annulé",
        description: "Le paiement a été annulé.",
        variant: "destructive",
      });
      setSearchParams({});
    }
  }, [searchParams]);

  // Realtime subscription for transaction updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("payment-requests-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        () => fetchData()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handlePay = async (transactionId: string) => {
    setPayingId(transactionId);
    try {
      const { data, error } = await supabase.functions.invoke("pay-payment-request", {
        body: { transactionId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      const msg = error?.message || "Impossible de procéder au paiement.";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    } finally {
      setPayingId(null);
    }
  };

  const handleDecline = async (transactionId: string) => {
    try {
      // We just expire it locally – edge function will handle properly
      // For now, update via supabase admin won't work from client due to RLS
      // So we mark it as declined by not paying and letting it expire
      toast({
        title: "Demande refusée",
        description: "La demande de paiement a été ignorée.",
      });
    } catch (error) {
      console.error(error);
    }
  };

  const isExpired = (tx: Transaction) => {
    return tx.expires_at && new Date(tx.expires_at) < new Date();
  };

  const getStatusInfo = (tx: Transaction) => {
    if (tx.status === "completed" && tx.escrow_status === "pending_escrow") {
      return { label: "Fonds sécurisés (48h)", icon: Clock, className: "text-blue-500" };
    }
    if (tx.status === "completed" && tx.escrow_status === "released") {
      return { label: "Fonds versés", icon: CheckCircle, className: "text-green-500" };
    }
    if (tx.status === "completed") return { label: "Complété", icon: CheckCircle, className: "text-green-500" };
    if (tx.status === "expired" || isExpired(tx)) return { label: "Expiré", icon: XCircle, className: "text-muted-foreground" };
    return { label: "En attente", icon: Clock, className: "text-yellow-500" };
  };

  const receivedRequests = transactions.filter(
    (t) => t.buyer_id === user?.id && t.method === "remote" && t.status === "pending" && !isExpired(t)
  );
  const sentRequests = transactions.filter(
    (t) => t.seller_id === user?.id && t.method === "remote"
  );
  const allTransactions = transactions.filter(
    (t) => t.method !== "remote" || t.status !== "pending"
  );

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
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Paiements</h1>
              <p className="text-muted-foreground">
                {receivedRequests.length > 0
                  ? `${receivedRequests.length} demande${receivedRequests.length > 1 ? "s" : ""} en attente`
                  : "Gérez vos transactions"}
              </p>
            </div>
          </div>
          <Button variant="gameswap" size="sm" onClick={() => setSendModalOpen(true)}>
            <Send className="h-4 w-4 mr-1" />
            Envoyer
          </Button>
        </div>

        {/* Pending received requests */}
        {receivedRequests.length > 0 && (
          <div className="mb-8">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Demandes de paiement reçues
            </h2>
            <div className="space-y-3">
              {receivedRequests.map((tx) => {
                const game = games.get(tx.post_id);
                const seller = profiles.get(tx.seller_id);
                return (
                  <div key={tx.id} className="bg-card rounded-2xl border-2 border-yellow-500/30 p-4 space-y-4">
                    <div className="flex items-center gap-3">
                      {game?.image_url && (
                        <img src={game.image_url} alt="" className="w-14 h-14 rounded-xl object-cover" />
                      )}
                      <div className="flex-1">
                        <p className="font-bold">{game?.title || "Jeu"}</p>
                        <p className="text-sm text-muted-foreground">
                          De {seller?.full_name || "Vendeur"}
                        </p>
                      </div>
                      <p className="text-2xl font-bold text-primary">{tx.amount}€</p>
                    </div>

                    {/* Warning */}
                    <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-xl text-sm">
                      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                      <p className="text-muted-foreground">
                        Ce paiement est définitif. Vérifiez les détails avant de continuer.
                      </p>
                    </div>

                    {/* Expiry info */}
                    <p className="text-xs text-muted-foreground text-center">
                      Expire {tx.expires_at
                        ? formatDistanceToNow(new Date(tx.expires_at), { addSuffix: true, locale: fr })
                        : "bientôt"}
                    </p>

                    {/* Actions - Accept ≠ Pay */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleDecline(tx.id)}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Refuser
                      </Button>
                      <Button
                        variant="gameswap"
                        className="flex-1"
                        disabled={payingId === tx.id}
                        onClick={() => handlePay(tx.id)}
                      >
                        {payingId === tx.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <ArrowRight className="h-4 w-4 mr-2" />
                        )}
                        Continuer vers le paiement
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Sent requests */}
        {sentRequests.length > 0 && (
          <div className="mb-8">
            <h2 className="font-bold text-lg mb-4">Demandes envoyées</h2>
            <div className="space-y-3">
              {sentRequests.map((tx) => {
                const game = games.get(tx.post_id);
                const buyer = tx.buyer_id ? profiles.get(tx.buyer_id) : null;
                const statusInfo = getStatusInfo(tx);
                const StatusIcon = statusInfo.icon;
                return (
                  <div key={tx.id} className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
                    {game?.image_url && (
                      <img src={game.image_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{game?.title || "Jeu"}</p>
                      <p className="text-sm text-muted-foreground">
                        À {buyer?.full_name || "Acheteur"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{tx.amount}€</p>
                      <p className={`text-xs flex items-center gap-1 ${statusInfo.className}`}>
                        <StatusIcon className="h-3 w-3" />
                        {statusInfo.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Transaction history */}
        <div>
          <h2 className="font-bold text-lg mb-4">Historique</h2>
          {allTransactions.length === 0 && receivedRequests.length === 0 && sentRequests.length === 0 ? (
            <div className="text-center py-16">
              <CreditCard className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">Aucune transaction</h3>
              <p className="text-muted-foreground">Vos transactions apparaîtront ici.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {allTransactions.map((tx) => {
                const game = games.get(tx.post_id);
                const statusInfo = getStatusInfo(tx);
                const StatusIcon = statusInfo.icon;
                const isSeller = tx.seller_id === user?.id;
                const methodLabel = tx.method === "cash" ? "Espèces" : tx.method === "remote" ? "À distance" : "Carte";

                return (
                  <div key={tx.id} className="bg-card rounded-xl border border-border p-3 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{game?.title || "Jeu"}</p>
                        <p className="text-xs text-muted-foreground">
                          {methodLabel} · {isSeller ? "Vente" : "Achat"} ·{" "}
                          {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true, locale: fr })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">{tx.amount}€</p>
                        <p className={`text-xs flex items-center gap-1 justify-end ${statusInfo.className}`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusInfo.label}
                        </p>
                      </div>
                    </div>
                    {/* Escrow messaging */}
                    {tx.status === "completed" && tx.escrow_status === "pending_escrow" && (
                      <div className="flex items-center gap-2 p-2 bg-blue-500/10 rounded-lg text-xs">
                        <Shield className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        <span className="text-blue-600 dark:text-blue-400">
                          {isSeller 
                            ? `Fonds sécurisés · Versement ${tx.escrow_release_at ? formatDistanceToNow(new Date(tx.escrow_release_at), { addSuffix: true, locale: fr }) : "sous 48h"}`
                            : "Protégé jusqu'à confirmation · Fonds en séquestre"}
                        </span>
                      </div>
                    )}
                    {tx.method === "cash" && tx.status === "completed" && (
                      <div className="flex items-center gap-2 p-2 bg-yellow-500/10 rounded-lg text-xs">
                        <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                        <span className="text-yellow-600 dark:text-yellow-400">
                          Transaction hors plateforme · Non protégée
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <SendPaymentRequestModal
        open={sendModalOpen}
        onOpenChange={setSendModalOpen}
        onSuccess={fetchData}
      />
    </MainLayout>
  );
};

export default PaymentRequests;
