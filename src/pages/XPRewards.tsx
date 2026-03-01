import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useXP } from "@/hooks/useXP";
import { useBadges } from "@/hooks/useBadges";
import { useMonthlyDraw } from "@/hooks/useMonthlyDraw";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Gem, Lock, Sparkles, Check, Eye, Gift, Award } from "lucide-react";
import { RANKS } from "@/lib/xpSystem";

type Rarity = "common" | "rare" | "epic" | "legendary";

interface Reward {
  id: string;
  icon: string;
  title: string;
  description: string;
  cost: number;
  rarity: Rarity;
}

const REWARDS: Reward[] = [
  { id: "giveaway", icon: "🎟️", title: "Tirage mensuel", description: "Participation au giveaway du mois", cost: 300, rarity: "common" },
  { id: "profile", icon: "🎨", title: "Personnalisation du profil", description: "Cadre et couleur de badge uniques", cost: 400, rarity: "rare" },
  { id: "boost24", icon: "🚀", title: "Boost annonce", description: "Mettez en avant votre annonce", cost: 600, rarity: "rare" },
  { id: "avatar", icon: "✨", title: "Accessoires d'avatar", description: "Accessoires limités exclusifs", cost: 900, rarity: "rare" },
  { id: "merch", icon: "👑", title: "Réduction merch", description: "Réduction exclusive sur le merch GameSwapp", cost: 2000, rarity: "legendary" },
];

const RARITY_CONFIG: Record<Rarity, { label: string; border: string; glow: string; badge: string; text: string }> = {
  common:    { label: "Common",    border: "border-emerald-500/40", glow: "",                                           badge: "bg-emerald-500/20 text-emerald-400", text: "text-emerald-400" },
  rare:      { label: "Rare",      border: "border-blue-500/40",    glow: "",                                           badge: "bg-blue-500/20 text-blue-400",       text: "text-blue-400" },
  epic:      { label: "Epic",      border: "border-purple-500/40",  glow: "",                                           badge: "bg-purple-500/20 text-purple-400",   text: "text-purple-400" },
  legendary: { label: "Legendary", border: "border-yellow-500/50",  glow: "shadow-[0_0_20px_rgba(234,179,8,0.15)]",     badge: "bg-yellow-500/20 text-yellow-400",   text: "text-yellow-400" },
};

const BADGE_RARITY_STYLES: Record<string, { bg: string; text: string }> = {
  common: { bg: "bg-emerald-500/20", text: "text-emerald-400" },
  rare: { bg: "bg-blue-500/20", text: "text-blue-400" },
  legendary: { bg: "bg-yellow-500/20", text: "text-yellow-400" },
};

const XPRewards = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { xpState, loading } = useXP(user?.id);
  const { userBadges, loading: badgesLoading } = useBadges(user?.id);
  const { checkDrawStatus, performDraw, drawing, lastReward, hasDrawnThisMonth } = useMonthlyDraw();

  const [animatedXP, setAnimatedXP] = useState(0);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [tappedId, setTappedId] = useState<string | null>(null);
  const [showDrawResult, setShowDrawResult] = useState(false);

  const xp = xpState?.xp ?? 0;
  const progress = xpState?.progressPercent ?? 0;
  const rank = xpState?.rank;
  const nextRank = xpState?.nextRank;
  const rankIndex = rank ? RANKS.findIndex((r) => r.name === rank.name) : 0;
  const level = rankIndex + 1;

  useEffect(() => { checkDrawStatus(); }, [checkDrawStatus]);

  // Animate XP counter
  useEffect(() => {
    if (loading) return;
    const target = xp;
    const duration = 800;
    const start = performance.now();
    const from = animatedXP;
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimatedXP(Math.round(from + (target - from) * eased));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [xp, loading]);

  useEffect(() => {
    if (loading) return;
    const timeout = setTimeout(() => setAnimatedProgress(progress), 150);
    return () => clearTimeout(timeout);
  }, [progress, loading]);

  const handleTap = (id: string) => {
    setTappedId(id);
    setTimeout(() => setTappedId(null), 300);
  };

  const handleDraw = async () => {
    const result = await performDraw();
    if (result) setShowDrawResult(true);
  };

  if (loading) {
    return (
      <MainLayout showSearch={false}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showSearch={false}>
      <div className="max-w-lg mx-auto pb-28 px-4">

        {/* Header */}
        <div className="flex items-center gap-3 pt-6 pb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/profile/analytics")} className="text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">XP Rewards</h1>
        </div>

        {/* Level + Progress Hero */}
        <div className="relative rounded-2xl border border-border bg-card/80 backdrop-blur-xl p-6 mb-6 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-pink-500/20 blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/25">
                <span className="text-xl font-black text-white">{level}</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Level</p>
                <p className="text-lg font-bold">{rank?.name ?? "Bronze"} {rank?.emoji}</p>
              </div>
            </div>
            {nextRank && (
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Next</p>
                <p className="text-sm font-semibold">{nextRank.emoji} {nextRank.name}</p>
              </div>
            )}
          </div>

          <div className="relative z-10 mb-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>{animatedXP.toLocaleString()} XP</span>
              <span>{nextRank ? `${nextRank.minXP.toLocaleString()} XP` : "MAX"}</span>
            </div>
            <div className="h-3 rounded-full bg-muted/50 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary via-purple-500 to-blue-500 transition-all duration-700 ease-out"
                style={{ width: `${animatedProgress}%` }}
              />
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-2 mt-4 px-3 py-2.5 rounded-xl bg-muted/30 border border-border/50">
            <Gem className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-bold">{animatedXP.toLocaleString()} XP</span>
            <span className="text-xs text-muted-foreground">disponible</span>
          </div>
        </div>

        {/* Monthly Draw */}
        <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-purple-500/5 p-5 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Gift className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold">Tirage Mensuel</h2>
              <p className="text-xs text-muted-foreground">1 récompense aléatoire par mois</p>
            </div>
          </div>

          {hasDrawnThisMonth ? (
            <div className="bg-card/60 rounded-xl p-4 border border-border/50">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{lastReward?.emoji || "🎁"}</span>
                <div>
                  <p className="font-semibold text-sm">{lastReward?.label || "Récompense obtenue"}</p>
                  <p className="text-xs text-muted-foreground">{lastReward?.description}</p>
                </div>
                <Check className="h-5 w-5 text-emerald-500 ml-auto" />
              </div>
              <p className="text-xs text-muted-foreground mt-3 text-center">Revenez le mois prochain !</p>
            </div>
          ) : hasDrawnThisMonth === false ? (
            <Button
              variant="gameswap"
              className="w-full"
              onClick={handleDraw}
              disabled={drawing}
            >
              {drawing ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Gift className="h-4 w-4 mr-2" />
              )}
              {drawing ? "Tirage en cours..." : "Tirer ma récompense !"}
            </Button>
          ) : null}
        </div>

        {/* Badges Section */}
        {!badgesLoading && userBadges.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Award className="h-4 w-4 text-primary" />
              <h2 className="text-base font-bold">Mes Badges</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {userBadges.map((ub) => {
                const style = BADGE_RARITY_STYLES[ub.badge.rarity] || BADGE_RARITY_STYLES.common;
                return (
                  <div
                    key={ub.id}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/50 ${style.bg}`}
                    title={`${ub.badge.description} (${ub.badge.rarity})`}
                  >
                    <span className="text-lg">{ub.badge.emoji}</span>
                    <span className={`text-xs font-semibold ${style.text}`}>{ub.badge.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section title */}
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-base font-bold">Dépenser vos XP</h2>
        </div>

        {/* Rewards list */}
        <div className="space-y-3">
          {REWARDS.map((reward) => {
            const canAfford = xp >= reward.cost;
            const rarity = RARITY_CONFIG[reward.rarity];
            const isTapped = tappedId === reward.id;

            return (
              <button
                key={reward.id}
                onClick={() => handleTap(reward.id)}
                className={`
                  w-full text-left rounded-2xl border p-4 transition-all duration-200
                  bg-card/60 backdrop-blur-sm
                  ${rarity.border}
                  ${reward.rarity === "legendary" ? rarity.glow : ""}
                  ${canAfford ? "ring-1 ring-primary/20" : "opacity-70"}
                  ${isTapped ? "scale-[0.97]" : "scale-100"}
                  active:scale-[0.97]
                `}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${canAfford ? "bg-gradient-to-br from-primary/20 to-purple-500/20" : "bg-muted/40"}`}>
                    {reward.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold truncate">{reward.title}</p>
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md ${rarity.badge}`}>
                        {rarity.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{reward.description}</p>
                    {!canAfford && (
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        Il vous manque <span className="font-semibold text-foreground/60">{(reward.cost - xp).toLocaleString()} XP</span>
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-1">
                    {canAfford ? (
                      <>
                        <span className="text-sm font-bold text-primary flex items-center gap-1">
                          <Gem className="h-3 w-3" />
                          {reward.cost.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                          <Check className="h-3 w-3" /> Disponible
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          {reward.cost.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60">Verrouillé</span>
                      </>
                    )}
                  </div>
                </div>

                {canAfford && (reward.id === "profile" || reward.id === "avatar") && (
                  <div className="mt-3 pt-3 border-t border-border/30">
                    <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
                      <Eye className="h-3 w-3" /> Aperçu
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
};

export default XPRewards;
