import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DecorativeBlobs } from "@/components/layout/DecorativeBlobs";
import { Mail, Lock, User, ArrowRight, Plus, Users, RefreshCw, AtSign, CheckCircle, XCircle, Loader2 } from "lucide-react";
import logo from "@/assets/gameswap-logo.png";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check username availability
  useEffect(() => {
    if (isLogin || !username.trim() || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    const isValidFormat = /^[a-zA-Z0-9_]+$/.test(username);
    if (!isValidFormat) {
      setUsernameAvailable(false);
      return;
    }

    setCheckingUsername(true);
    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc("is_username_available", { check_username: username });
        if (!error) setUsernameAvailable(data);
      } catch (err) {
        console.error("Error checking username:", err);
      } finally {
        setCheckingUsername(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username, isLogin]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLogin) {
      if (!username.trim() || username.length < 3) {
        toast({ title: "Pseudo requis", description: "Minimum 3 caractères.", variant: "destructive" });
        return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        toast({ title: "Format invalide", description: "Lettres, chiffres et underscores seulement.", variant: "destructive" });
        return;
      }
      if (usernameAvailable === false) {
        toast({ title: "Pseudo indisponible", description: "Choisissez un autre pseudo.", variant: "destructive" });
        return;
      }
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.includes("User not found")) {
            toast({ title: "Compte introuvable", description: "Aucun compte avec cet email. Créez-en un !", variant: "destructive" });
          } else {
            toast({ title: "Erreur de connexion", description: error.message, variant: "destructive" });
          }
          return;
        }
        navigate("/");
      } else {
        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, username: username } },
        });

        if (error) {
          if (error.message.includes("already registered")) {
            toast({ title: "Compte existant", description: "Email déjà utilisé.", variant: "destructive" });
          } else {
            toast({ title: "Erreur d'inscription", description: error.message, variant: "destructive" });
          }
          return;
        }

        // Auto-login après signup
        if (signUpData?.user) {
          const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
          if (loginError) {
            toast({ title: "Erreur login", description: loginError.message, variant: "destructive" });
          } else {
            toast({ title: "Compte créé !", description: "Bienvenue !" });
            navigate("/");
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <DecorativeBlobs />
      <div className="mb-8 animate-fade-in">
        <img src={logo} alt="GameSwap" className="w-20 h-20 rounded-2xl shadow-lg" />
      </div>
      <div className="text-center mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold mb-2">Bienvenue !</h1>
        <p className="text-muted-foreground">Le marché privé dédié à votre groupe de jeux de société.</p>
      </div>

      <div className="w-full max-w-md bg-card rounded-3xl border border-border p-6 shadow-soft animate-slide-up">
        <div className="flex items-center gap-2 mb-6">
          <User className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-lg">{isLogin ? "Connexion" : "Créez votre compte"}</h2>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <Label htmlFor="fullName">Nom complet</Label>
                <Input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="username">Pseudo (unique)</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  className="mt-1"
                />
                {usernameAvailable === false && <p className="text-xs text-destructive mt-1">Pseudo déjà pris</p>}
              </div>
            </>
          )}

          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Chargement..." : isLogin ? "Se connecter" : "Continuer"} <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}{" "}
          <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-primary font-semibold hover:underline">
            {isLogin ? "S'inscrire" : "Se connecter"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
