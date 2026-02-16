import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, Clock, Star, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTrades, type Trade } from "@/hooks/useTrades";
import { useRatings } from "@/hooks/useRatings";
import { RatingModal } from "./RatingModal";

interface TradeCardProps {
  trade: Trade;
  onUpdate: () => void;
}

export const TradeCard = ({ trade, onUpdate }: TradeCardProps) => {
  const { user } = useAuth();
  const { confirmTrade } = useTrades();
  const { hasRatedTrade } = useRatings();
  const [confirming, setConfirming] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [alreadyRated, setAlreadyRated] = useState(false);

  const isUser1 = user?.id === trade.user1_id;
  const myConfirmed = isUser1 ? trade.user1_confirmed : trade.user2_confirmed;
  const otherConfirmed = isUser1 ? trade.user2_confirmed : trade.user1_confirmed;
  const isCompleted = trade.status === "completed";
  const otherUserId = isUser1 ? trade.user2_id : trade.user1_id;

  useEffect(() => {
    if (isCompleted) {
      hasRatedTrade(trade.id).then(setAlreadyRated);
    }
  }, [isCompleted, trade.id, hasRatedTrade]);

  const handleConfirm = async () => {
    setConfirming(true);
    await confirmTrade(trade.id);
    setConfirming(false);
    onUpdate();
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
      <div className="flex items-center gap-3">
        {trade.listing?.image_url ? (
          <img src={trade.listing.image_url} alt="" className="w-14 h-14 rounded-xl object-cover" />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center text-2xl">🎲</div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{trade.listing?.title || "Jeu"}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Avatar className="h-6 w-6">
              <AvatarImage src={trade.other_user?.avatar_url || undefined} />
              <AvatarFallback className="text-xs">{trade.other_user?.full_name?.[0] || "?"}</AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">{trade.other_user?.full_name || "Utilisateur"}</span>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
          isCompleted ? "bg-green-500/10 text-green-600" : "bg-yellow-500/10 text-yellow-600"
        }`}>
          {isCompleted ? "Terminé" : "En cours"}
        </div>
      </div>

      {/* Confirmation status */}
      <div className="flex gap-2 text-sm">
        <div className={`flex items-center gap-1 ${myConfirmed ? "text-green-600" : "text-muted-foreground"}`}>
          {myConfirmed ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
          Vous: {myConfirmed ? "Confirmé" : "En attente"}
        </div>
        <div className={`flex items-center gap-1 ${otherConfirmed ? "text-green-600" : "text-muted-foreground"}`}>
          {otherConfirmed ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
          Partenaire: {otherConfirmed ? "Confirmé" : "En attente"}
        </div>
      </div>

      {/* Actions */}
      {!isCompleted && !myConfirmed && (
        <Button onClick={handleConfirm} disabled={confirming} variant="gameswap" size="sm" className="w-full">
          {confirming ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
          Marquer comme terminé
        </Button>
      )}

      {isCompleted && !alreadyRated && (
        <Button onClick={() => setRatingOpen(true)} variant="outline" size="sm" className="w-full">
          <Star className="h-4 w-4 mr-2" />
          Évaluer cet échange
        </Button>
      )}

      {isCompleted && alreadyRated && (
        <p className="text-sm text-muted-foreground text-center">✅ Évaluation envoyée</p>
      )}

      <RatingModal
        open={ratingOpen}
        onOpenChange={setRatingOpen}
        tradeId={trade.id}
        ratedUserId={otherUserId}
        ratedUserName={trade.other_user?.full_name || "Utilisateur"}
        onSuccess={() => { setAlreadyRated(true); onUpdate(); }}
      />
    </div>
  );
};
