import { useState } from "react";
import { Rocket, Zap, CreditCard, Loader2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useXP } from "@/hooks/useXP";
import { PAID_BOOST_OPTIONS, XP_BOOST_COSTS } from "@/lib/xpSystem";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface BoostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
  gameTitle: string;
  onSuccess?: () => void;
}

export const BoostModal = ({ open, onOpenChange, gameId, gameTitle, onSuccess }: BoostModalProps) => {
  const { xpState, spendXPBoost } = useXP();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [tab, setTab] = useState<"xp" | "paid">("xp");

  const handleXPBoost = async (type: "48H" | "7D") => {
    setLoading(type);
    const success = await spendXPBoost(gameId, type);
    setLoading(null);
    if (success) {
      onSuccess?.();
      onOpenChange(false);
    }
  };

  const handlePaidBoost = async (optionId: string) => {
    if (!user) return;
    setLoading(optionId);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const { data, error } = await supabase.functions.invoke("create-boost-payment", {
        body: { gameId, boostType: optionId },
      });
      if (error || !data?.url) {
        throw new Error(error?.message || "Erreur paiement");
      }
      window.open(data.url, "_blank");
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message || "Impossible de démarrer le paiement", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Augmenter la visibilité
          </DialogTitle>
          <p className="text-sm text-muted-foreground">"{gameTitle}"</p>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex rounded-xl bg-muted p-1 gap-1">
          <button
            onClick={() => setTab("xp")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === "xp" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
          >
            <Zap className="h-4 w-4 inline mr-1.5" />
            Boost XP
          </button>
          <button
            onClick={() => setTab("paid")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === "paid" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
          >
            <CreditCard className="h-4 w-4 inline mr-1.5" />
            Boost Payant
          </button>
        </div>

        {tab === "xp" ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm p-3 bg-muted/50 rounded-xl">
              <span className="text-muted-foreground">Votre solde XP</span>
              <span className="font-bold text-yellow-500 flex items-center gap-1">
                <Zap className="h-4 w-4" />
                {(xpState?.xp || 0).toLocaleString()} XP
              </span>
            </div>

            {(Object.entries(XP_BOOST_COSTS) as [keyof typeof XP_BOOST_COSTS, number][]).map(([type, cost]) => {
              const canAfford = (xpState?.xp || 0) >= cost;
              const label = type === "48H" ? "Boost 48 heures" : "Boost 7 jours";
              return (
                <button
                  key={type}
                  onClick={() => canAfford && handleXPBoost(type)}
                  disabled={!canAfford || !!loading}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                    canAfford
                      ? "border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary cursor-pointer"
                      : "border-border bg-muted/30 opacity-50 cursor-not-allowed"
                  }`}
                >
                  <div className="text-left">
                    <p className="font-semibold">{label}</p>
                    <p className="text-sm text-muted-foreground">
                      {canAfford ? "Votre annonce apparaît en tête de liste" : "XP insuffisant"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 font-bold text-yellow-500 shrink-0">
                    {loading === type ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <><Zap className="h-4 w-4" />{cost}</>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Les boosts payants s'accumulent avec votre multiplicateur XP et donnent une visibilité maximale.
            </p>
            {PAID_BOOST_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => handlePaidBoost(option.id)}
                disabled={!!loading}
                className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary transition-all cursor-pointer"
              >
                <div className="text-left">
                  <p className="font-semibold">{option.label}</p>
                  <p className="text-sm text-muted-foreground">
                    Visibilité maximale pendant {option.duration}
                  </p>
                </div>
                <div className="font-bold text-primary shrink-0">
                  {loading === option.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    option.priceStr
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
