import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Mail, Shield, Check, Loader2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface ChangeEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "password" | "verify_current" | "new_email" | "verify_new" | "complete";

export const ChangeEmailModal = ({ open, onOpenChange }: ChangeEmailModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("password");
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [hint, setHint] = useState("");
  const [message, setMessage] = useState("");

  const reset = () => {
    setStep("password");
    setPassword("");
    setCode("");
    setNewEmail("");
    setHint("");
    setMessage("");
  };

  const handleClose = (o: boolean) => {
    if (!loading) {
      reset();
      onOpenChange(o);
    }
  };

  const callAction = async (action: string, data: Record<string, string>) => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("change-email", {
        body: { action, ...data },
      });
      if (error) throw error;
      if (res?.error) throw new Error(res.error);
      return res;
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    const res = await callAction("initiate", { password });
    if (res) {
      setHint(res.hint || "");
      setMessage(res.message || "");
      setCode("");
      setStep("verify_current");
    }
  };

  const handleVerifyCurrent = async () => {
    const res = await callAction("verify_current", { code });
    if (res) {
      setCode("");
      setStep("new_email");
    }
  };

  const handleSetNewEmail = async () => {
    const res = await callAction("set_new_email", { newEmail });
    if (res) {
      setHint(res.hint || "");
      setMessage(res.message || "");
      setCode("");
      setStep("verify_new");
    }
  };

  const handleVerifyNew = async () => {
    const res = await callAction("verify_new", { code });
    if (res) {
      setStep("complete");
      toast({ title: "Email mis à jour !", description: "Votre email a été changé avec succès." });
    }
  };

  const STEPS: Record<Step, { icon: React.ReactNode; title: string; subtitle: string }> = {
    password: { icon: <Lock className="h-5 w-5" />, title: "Vérification d'identité", subtitle: "Entrez votre mot de passe actuel" },
    verify_current: { icon: <Shield className="h-5 w-5" />, title: "Code de vérification", subtitle: message || "Entrez le code envoyé à votre email actuel" },
    new_email: { icon: <Mail className="h-5 w-5" />, title: "Nouvel email", subtitle: "Entrez votre nouvelle adresse email" },
    verify_new: { icon: <Shield className="h-5 w-5" />, title: "Confirmation", subtitle: message || "Entrez le code envoyé au nouvel email" },
    complete: { icon: <Check className="h-5 w-5" />, title: "Terminé !", subtitle: "Votre email a été mis à jour" },
  };

  const currentStep = STEPS[step];
  const stepNumber = ["password", "verify_current", "new_email", "verify_new", "complete"].indexOf(step) + 1;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {currentStep.icon}
            {currentStep.title}
          </DialogTitle>
        </DialogHeader>

        {/* Progress */}
        <div className="flex gap-1 mb-2">
          {[1, 2, 3, 4, 5].map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= stepNumber ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <p className="text-sm text-muted-foreground mb-4">{currentStep.subtitle}</p>

        {step === "password" && (
          <div className="space-y-4">
            <div>
              <Label>Email actuel</Label>
              <Input value={user?.email || ""} disabled className="bg-muted/30" />
            </div>
            <div>
              <Label>Mot de passe</Label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Votre mot de passe"
                autoFocus
              />
            </div>
            <Button onClick={handlePasswordSubmit} disabled={!password || loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continuer"}
            </Button>
          </div>
        )}

        {(step === "verify_current" || step === "verify_new") && (
          <div className="space-y-4">
            {hint && (
              <p className="text-xs text-muted-foreground text-center">
                Code commençant par <span className="font-mono font-bold text-foreground">{hint}</span>
              </p>
            )}
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={code} onChange={setCode}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map(i => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button
              onClick={step === "verify_current" ? handleVerifyCurrent : handleVerifyNew}
              disabled={code.length < 6 || loading}
              className="w-full"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Vérifier"}
            </Button>
          </div>
        )}

        {step === "new_email" && (
          <div className="space-y-4">
            <div>
              <Label>Nouvel email</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="nouveau@email.com"
                autoFocus
              />
            </div>
            <Button onClick={handleSetNewEmail} disabled={!newEmail.includes("@") || loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Envoyer le code"}
            </Button>
          </div>
        )}

        {step === "complete" && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
              <Check className="h-8 w-8 text-emerald-500" />
            </div>
            <Button onClick={() => handleClose(false)} className="w-full">Fermer</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
