import { useState, useEffect } from "react";
import { Star, Shield, Award } from "lucide-react";
import { useRatings, type UserReputation as ReputationType } from "@/hooks/useRatings";

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

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
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
      <h3 className="font-semibold flex items-center gap-2">
        <Award className="h-5 w-5 text-primary" />
        Réputation
      </h3>

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

      {reputation.isVerified && (
        <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded-xl">
          <Shield className="h-5 w-5 text-green-500" />
          <div>
            <p className="text-sm font-semibold text-green-600">Vendeur vérifié</p>
            <p className="text-xs text-muted-foreground">3+ échanges, note ≥ 4.0</p>
          </div>
        </div>
      )}
    </div>
  );
};
