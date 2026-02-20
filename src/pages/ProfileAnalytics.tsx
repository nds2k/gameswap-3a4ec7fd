import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, TrendingUp, Zap, Shield, Award } from "lucide-react";
import { useXP } from "@/hooks/useXP";
import { useRatings } from "@/hooks/useRatings";
import type { UserReputation } from "@/hooks/useRatings";
import { Loader2 } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

interface XPTransaction {
  amount: number;
  reason: string;
  created_at: string;
}

interface MonthlyTrade {
  month: string;
  trades: number;
}

const RANK_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  Bronze:   { label: "Bronze",   color: "text-amber-700",  bg: "bg-amber-700/10" },
  Silver:   { label: "Silver",   color: "text-slate-400",  bg: "bg-slate-400/10" },
  Gold:     { label: "Gold",     color: "text-yellow-500", bg: "bg-yellow-500/10" },
  Platinum: { label: "Platinum", color: "text-cyan-400",   bg: "bg-cyan-400/10" },
  Elite:    { label: "Elite",    color: "text-purple-400", bg: "bg-purple-400/10" },
};

const ProfileAnalytics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { xpState, loading: xpLoading } = useXP(user?.id);
  const { getUserReputation } = useRatings();

  const [reputation, setReputation] = useState<UserReputation | null>(null);
  const [xpHistory, setXPHistory] = useState<{ date: string; xp: number }[]>([]);
  const [monthlyTrades, setMonthlyTrades] = useState<MonthlyTrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    fetchAnalytics();
  }, [user]);

  const fetchAnalytics = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [rep, xpTxns, trades] = await Promise.all([
        getUserReputation(user.id),
        supabase
          .from("xp_transactions")
          .select("amount, reason, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(100),
        supabase
          .from("trades")
          .select("created_at, status")
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .eq("status", "completed"),
      ]);

      setReputation(rep);

      // Build cumulative XP chart data
      if (xpTxns.data && xpTxns.data.length > 0) {
        let cumulative = 0;
        const hist = xpTxns.data.map((tx) => {
          cumulative += tx.amount;
          return {
            date: format(new Date(tx.created_at!), "dd MMM", { locale: fr }),
            xp: Math.max(0, cumulative),
          };
        });
        setXPHistory(hist);
      } else {
        setXPHistory([{ date: "Maintenant", xp: xpState?.xp ?? 0 }]);
      }

      // Build monthly trades chart (last 6 months)
      const months: MonthlyTrade[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        const label = format(d, "MMM", { locale: fr });
        const start = startOfMonth(d).toISOString();
        const end = endOfMonth(d).toISOString();
        const count = (trades.data || []).filter((t) => {
          return t.created_at >= start && t.created_at <= end;
        }).length;
        months.push({ month: label, trades: count });
      }
      setMonthlyTrades(months);
    } catch (err) {
      console.error("Analytics error:", err);
    } finally {
      setLoading(false);
    }
  };

  const rankStyle = xpState ? (RANK_STYLES[xpState.rank.name] ?? RANK_STYLES.Bronze) : RANK_STYLES.Bronze;

  if (loading || xpLoading) {
    return (
      <MainLayout showSearch={false}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showSearch={false}>
      <div className="max-w-2xl mx-auto pb-24 px-4">

        {/* Header */}
        <div className="flex items-center gap-3 pt-6 pb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Statistiques</h1>
        </div>

        {/* Summary Row */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-card rounded-2xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">XP total</span>
            </div>
            <p className="text-2xl font-bold">{xpState?.xp.toLocaleString() ?? 0}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Rang</span>
            </div>
            <span className={`text-lg font-bold ${rankStyle.color}`}>
              {rankStyle.label}
            </span>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-4 w-4 text-yellow-400" />
              <span className="text-sm text-muted-foreground">Note moyenne</span>
            </div>
            <p className="text-2xl font-bold">
              {reputation && reputation.totalReviews > 0
                ? reputation.averageRating.toFixed(1)
                : "—"}
            </p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Échanges</span>
            </div>
            <p className="text-2xl font-bold">{reputation?.completedTrades ?? 0}</p>
          </div>
        </div>

        {/* Verified badge */}
        {reputation?.isVerified && (
          <div className="flex items-center gap-2 bg-green-500/10 rounded-2xl px-4 py-3 mb-6">
            <Shield className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm font-semibold text-green-600 dark:text-green-400">Vendeur vérifié</p>
              <p className="text-xs text-muted-foreground">3+ échanges, note ≥ 4.0</p>
            </div>
          </div>
        )}

        {/* XP Progression Chart */}
        {xpHistory.length > 1 && (
          <div className="bg-card rounded-2xl border border-border p-5 mb-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              Progression XP
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={xpHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="xpGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Area
                  type="monotone"
                  dataKey="xp"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#xpGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Monthly Trades Chart */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            Échanges par mois
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyTrades} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Bar dataKey="trades" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </MainLayout>
  );
};

export default ProfileAnalytics;
