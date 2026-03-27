import { Zap, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useXP } from "@/hooks/useXP";

interface XPProgressCardProps {
  userId: string;
}

export const XPProgressCard = ({ userId }: XPProgressCardProps) => {
  const { xpState, loading } = useXP(userId);

  if (loading || !xpState) return null;

  const { xp, rank, nextRank, progressPercent, xpToNext } = xpState;

  return (
    <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          Niveau & XP
        </h3>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-bold ${rank.bgColor} ${rank.color}`}>
          <span>{rank.emoji}</span>
          <span>{rank.name}</span>
        </div>
      </div>

      {/* XP Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground font-medium">{xp.toLocaleString()} XP</span>
          {nextRank && (
            <span className="text-muted-foreground">{nextRank.minXP.toLocaleString()} XP → {nextRank.emoji} {nextRank.name}</span>
          )}
          {!nextRank && (
            <span className={`font-semibold ${rank.color}`}>Rang maximum !</span>
          )}
        </div>
        <Progress value={progressPercent} className="h-3 rounded-full" />
        {xpToNext && (
          <p className="text-xs text-muted-foreground text-center">
            <span className="font-semibold text-foreground">{xpToNext.toLocaleString()} XP</span> pour atteindre {nextRank?.emoji} {nextRank?.name}
          </p>
        )}
      </div>

      {/* Perks */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
          <TrendingUp className="h-3.5 w-3.5" />
          Avantages débloqués
        </p>
        <ul className="space-y-1">
          {rank.perks.map((perk) => (
            <li key={perk} className="text-sm flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              {perk}
            </li>
          ))}
        </ul>
        {nextRank && (
          <div className="mt-2 pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Prochain rang {nextRank.emoji} <span className="font-semibold">{nextRank.name}</span> : {nextRank.perks[0]}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
