import { useState, useEffect } from "react";
import { Star, Shield, Award, Calendar } from "lucide-react";
import { useRatings, type UserReputation as ReputationType, LEAGUE_CONFIG } from "@/hooks/useRatings";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface UserReputationProps {
  userId: string;
  compact?: boolean;
}

export const UserReputation = ({ userId, compact = false }: UserReputationProps) => {
  const { getUserReputation } = useRatings();
  const [reputation, setReputation] = useState<ReputationType | null>(null);

  useEffect(() => {
    getUserReputation(userId).then(setReputation);
  }, [userId, getUserReputation]);

  if (!reputation) return null;

  const leagueInfo = LEAGUE_CONFIG[reputation.league];

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs" title={leagueInfo.label}>{leagueInfo.emoji}</span>
        {reputation.totalReviews > 0 && (
          <>
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium">{reputation.averageRating.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({reputation.totalReviews})</span>
          </>
        )}
        {reputation.isVerified && (
          <Shield className="h-4 w-4 text-green-500 ml-1" />
        )}
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Réputation
        </h3>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-sm font-semibold ${leagueInfo.color}`}>
          <span>{leagueInfo.emoji}</span>
          <span>{leagueInfo.label}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="flex items-center justify-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-xl font-bold">
              {reputation.totalReviews > 0 ? reputation.averageRating.toFixed(1) : "—"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Note moyenne</p>
        </div>
        <div>
          <p className="text-xl font-bold">{reputation.totalReviews}</p>
          <p className="text-xs text-muted-foreground">Avis</p>
        </div>
        <div>
          <p className="text-xl font-bold">{reputation.completedTrades}</p>
          <p className="text-xs text-muted-foreground">Échanges</p>
        </div>
      </div>

      {/* Score bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Score de réputation</span>
          <span className="font-semibold text-foreground">{reputation.reputationScore} pts</span>
        </div>
        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.min((reputation.reputationScore / 200) * 100, 100)}%` }}
          />
        </div>
      </div>

      {reputation.isVerified && (
        <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded-xl">
          <Shield className="h-5 w-5 text-green-500" />
          <div>
            <p className="text-sm font-semibold text-green-600 dark:text-green-400">Vendeur vérifié</p>
            <p className="text-xs text-muted-foreground">3+ échanges, note ≥ 4.0</p>
          </div>
        </div>
      )}

      {reputation.memberSince && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
          <Calendar className="h-3.5 w-3.5" />
          <span>Membre depuis {format(new Date(reputation.memberSince), "MMMM yyyy", { locale: fr })}</span>
        </div>
      )}
    </div>
  );
};