import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Flag } from "lucide-react";

const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harcèlement" },
  { value: "inappropriate", label: "Contenu inapproprié" },
  { value: "scam", label: "Arnaque" },
  { value: "other", label: "Autre" },
];

interface ReportMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageId: string;
  reportedUserId: string;
  onSuccess?: () => void;
}

export const ReportMessageModal = ({
  open,
  onOpenChange,
  messageId,
  reportedUserId,
  onSuccess,
}: ReportMessageModalProps) => {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      toast.error("Veuillez sélectionner une raison");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase.from("message_reports").insert({
        message_id: messageId,
        reported_user_id: reportedUserId,
        reporter_id: user.id,
        reason,
        description: description.trim() || null,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("Vous avez déjà signalé ce message");
        } else {
          throw error;
        }
      } else {
        toast.success("Message signalé avec succès");
        onOpenChange(false);
        setReason("");
        setDescription("");
        onSuccess?.();
      }
    } catch (err) {
      console.error("Error reporting message:", err);
      toast.error("Erreur lors du signalement");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            Signaler ce message
          </DialogTitle>
          <DialogDescription>
            Ce signalement sera examiné. Les utilisateurs avec trop de signalements seront temporairement bannis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Raison du signalement</label>
            <div className="grid grid-cols-2 gap-2">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setReason(r.value)}
                  className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                    reason === r.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted border-border hover:border-primary/50"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description (optionnelle)</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez le problème..."
              rows={3}
              maxLength={500}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isSubmitting || !reason}
          >
            {isSubmitting ? "Envoi..." : "Signaler"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
