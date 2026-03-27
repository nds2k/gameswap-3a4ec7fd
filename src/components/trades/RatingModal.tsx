import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2 } from "lucide-react";
import { useRatings } from "@/hooks/useRatings";

interface RatingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tradeId: string;
  ratedUserId: string;
  ratedUserName: string;
  onSuccess?: () => void;
}

export const RatingModal = ({ open, onOpenChange, tradeId, ratedUserId, ratedUserName, onSuccess }: RatingModalProps) => {
  const { submitRating } = useRatings();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setLoading(true);
    const success = await submitRating(tradeId, ratedUserId, rating, comment);
    setLoading(false);
    if (success) {
      setRating(0);
      setComment("");
      onOpenChange(false);
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Évaluer {ratedUserName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Stars */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => setRating(star)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`h-10 w-10 transition-colors ${
                    star <= (hoveredRating || rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground">
            {rating === 0 ? "Sélectionnez une note" : `${rating}/5 étoile${rating > 1 ? "s" : ""}`}
          </p>

          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Commentaire optionnel..."
            rows={3}
          />

          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || loading}
            variant="gameswap"
            className="w-full"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Envoyer l'évaluation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
