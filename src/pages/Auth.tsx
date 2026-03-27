import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check username availability with debounce
  useEffect(() => {
    if (isLogin || !username.trim() || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    // Validate username format (alphanumeric + underscores only)
    const isValidFormat = /^[a-zA-Z0-9_]+$/.test(username);
    if (!isValidFormat) {
      setUsernameAvailable(false);
      return;
    }

    setCheckingUsername(true);
    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc("is_username_available", {
          check_username: username,
        });
        
        if (!error) {
          setUsernameAvailable(data);
        }
      } catch (error) {
        console.error("Error checking username:", error);
      } finally {
        setCheckingUsername(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username, isLogin]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLogin) {
      // Validate username
      if (!username.trim() || username.length < 3) {
        toast({
          title: "Pseudo requis",
          description: "Le pseudo doit contenir au moins 3 caractères.",
          variant: "destructive",
        });
        return;
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        toast({
          title: "Format invalide",
          description: "Le pseudo ne peut contenir que des lettres, chiffres et underscores.",
          variant: "destructive",
        });
        return;
      }

      if (!usernameAvailable) {
        toast({
          title: "Pseudo indisponible",
          description: "Ce pseudo est déjà pris. Choisissez-en un autre.",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signInWithEmail(email, password);
        if (error) {
          toast({
            title: "Erreur de connexion",
            description: error.message,
            variant: "destructive",
          });
        } else {
          navigate("/");
        }
      } else {
        const { error } = await signUpWithEmail(email, password, fullName, username);
        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              title: "Compte existant",
              description: "Un compte existe déjà avec cet email. Connectez-vous.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Erreur d'inscription",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Compte créé !",
            description: "Bienvenue !",
          });
          navigate("/");
        }
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <DecorativeBlobs />

      {/* Logo */}
      <div className="mb-8 animate-fade-in">
        <img src={logo} alt="GameSwap" className="w-20 h-20 rounded-2xl shadow-lg" />
      </div>

      {/* Title */}
      <div className="text-center mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold mb-2">
          Bienvenue !
        </h1>
        <p className="text-muted-foreground">
          Le marché privé dédié à votre groupe de jeux de société.
        </p>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md bg-card rounded-3xl border border-border p-6 shadow-soft animate-slide-up">
        <div className="flex items-center gap-2 mb-6">
          <User className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-lg">
            {isLogin ? "Connexion" : "Créez votre compte"}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          {isLogin
            ? "Connectez-vous pour accéder à vos jeux."
            : "Rejoignez vos amis et commencez à échanger."}
        </p>

        <form onSubmit={handleEmailAuth} className="space-y-4">
        {!isLogin && (
            <>
              <div>
                <Label htmlFor="fullName">Nom complet</Label>
                <div className="relative mt-1.5">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Ex: Nicolas"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="username">Pseudo (unique)</Label>
                <div className="relative mt-1.5">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Ex: nicolas_42"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    className="pl-10 pr-10"
                    required
                    minLength={3}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {checkingUsername && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {!checkingUsername && username.length >= 3 && usernameAvailable === true && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {!checkingUsername && username.length >= 3 && usernameAvailable === false && (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                </div>
                {username.length >= 3 && usernameAvailable === false && (
                  <p className="text-xs text-destructive mt-1">Ce pseudo est déjà pris</p>
                )}
                {username.length > 0 && username.length < 3 && (
                  <p className="text-xs text-muted-foreground mt-1">Minimum 3 caractères</p>
                )}
              </div>
            </>
          )}

          <div>
            <Label htmlFor="email">Email</Label>
            <div className="relative mt-1.5">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="ton@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="password">Mot de passe</Label>
            <div className="relative mt-1.5">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="pl-10"
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="gameswap"
            className="w-full"
            disabled={loading}
          >
            {loading ? "Chargement..." : isLogin ? "Se connecter" : "Continuer"}
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>

          {isLogin && (
            <button
              type="button"
              onClick={async () => {
                if (!email.trim()) {
                  toast({ title: "Email requis", description: "Entrez votre email pour réinitialiser votre mot de passe.", variant: "destructive" });
                  return;
                }
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                  redirectTo: `${window.location.origin}/reset-password`,
                });
                if (error) {
                  toast({ title: "Erreur", description: error.message, variant: "destructive" });
                } else {
                  toast({ title: "Email envoyé", description: "Vérifiez votre boîte mail pour réinitialiser votre mot de passe." });
                }
              }}
              className="w-full text-center text-sm text-primary hover:underline mt-2"
            >
              Mot de passe oublié ?
            </button>
          )}
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}{" "}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary font-semibold hover:underline"
          >
            {isLogin ? "S'inscrire" : "Se connecter"}
          </button>
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-3 gap-4 mt-8 max-w-md w-full animate-fade-in">
        <div className="bg-card rounded-2xl border border-border p-4 text-center">
          <Plus className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
          <p className="text-xs font-medium">Créer des groupes</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 text-center">
          <Users className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
          <p className="text-xs font-medium">Inviter des amis</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 text-center">
          <RefreshCw className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
          <p className="text-xs font-medium">Échanger des jeux</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
