import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DecorativeBlobs } from "@/components/layout/DecorativeBlobs";
import { User, ArrowRight } from "lucide-react";
import logo from "@/assets/gameswap-logo.png";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Vérifie la disponibilité d'un username sans planter si aucune ligne n'existe.
 * `.single()` lève une erreur PGRST116 quand 0 ligne → on utilise `.maybeSingle()` à la place.
 */
const checkUsernameAvailability = async (username: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle(); // ✅ retourne null si 0 ligne, pas d'erreur

  if (error) throw error;
  return data === null; // true = disponible
};

/**
 * Traduit les messages d'erreur Supabase en messages user-friendly.
 */
const getFriendlyError = (message: string): string => {
  if (message.includes("already registered") || message.includes("User already registered")) {
    return "Cet email est déjà utilisé. Connectez-vous ou utilisez un autre email.";
  }
  if (message.includes("Invalid login credentials")) {
    return "Email ou mot de passe incorrect.";
  }
  if (message.includes("Email not confirmed")) {
    return "Veuillez confirmer votre email avant de vous connecter.";
  }
  if (message.includes("Password should be at least")) {
    return "Le mot de passe doit contenir au moins 6 caractères.";
  }
  if (message.includes("duplicate key") && message.includes("username")) {
    return "Ce pseudo est déjà pris. Choisissez-en un autre.";
  }
  if (message.includes("duplicate key") && message.includes("email")) {
    return "Cet email est déjà utilisé.";
  }
  return "Une erreur inattendue s'est produite. Veuillez réessayer.";
};

// ─── Component ────────────────────────────────────────────────────────────────

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

  // ── Vérification username en temps réel ─────────────────────────────────────
  useEffect(() => {
    if (isLogin || !username.trim() || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    setCheckingUsername(true);
    setUsernameAvailable(null);

    const timer = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailability(username);
        setUsernameAvailable(available);
      } catch {
        // En cas d'erreur réseau, on laisse passer — la validation finale bloquera
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username, isLogin]);

  // ── Validation formulaire ────────────────────────────────────────────────────
  const validateSignUp = (): boolean => {
    if (!fullName.trim()) {
      toast({ title: "Nom requis", description: "Veuillez entrer votre nom complet.", variant: "destructive" });
      return false;
    }
    if (!username.trim() || username.length < 3) {
      toast({ title: "Pseudo requis", description: "Minimum 3 caractères.", variant: "destructive" });
      return false;
    }
    if (!/^[a-z0-9_]+$/.test(username)) {
      toast({ title: "Format invalide", description: "Lettres minuscules, chiffres et underscores seulement.", variant: "destructive" });
      return false;
    }
    if (usernameAvailable === false) {
      toast({ title: "Pseudo indisponible", description: "Ce pseudo est déjà pris. Choisissez-en un autre.", variant: "destructive" });
      return false;
    }
    if (password.length < 6) {
      toast({ title: "Mot de passe trop court", description: "Minimum 6 caractères.", variant: "destructive" });
      return false;
    }
    return true;
  };

  // ── Handler principal ────────────────────────────────────────────────────────
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLogin && !validateSignUp()) return;

    setLoading(true);

    try {
      // ── CONNEXION ──────────────────────────────────────────────────────────
      if (isLogin) {
        const { error } = await signInWithEmail(email, password);
        if (error) {
          toast({
            title: "Connexion impossible",
            description: getFriendlyError(error.message),
            variant: "destructive",
          });
          return;
        }
        navigate("/");
        return;
      }

      // ── INSCRIPTION ────────────────────────────────────────────────────────

      // Vérification finale du username (au cas où le debounce n'a pas eu le temps)
      if (usernameAvailable === null) {
        try {
          const available = await checkUsernameAvailability(username);
          if (!available) {
            toast({ title: "Pseudo indisponible", description: "Ce pseudo est déjà pris.", variant: "destructive" });
            return;
          }
        } catch {
          // Si on ne peut pas vérifier, on laisse Supabase gérer la contrainte unique
        }
      }

      // 1. Créer le compte auth
      const { error: signUpError, user } = await signUpWithEmail(email, password, fullName, username);

      if (signUpError) {
        toast({
          title: "Erreur d'inscription",
          description: getFriendlyError(signUpError.message),
          variant: "destructive",
        });
        return;
      }

      if (!user?.id) {
        // Ne devrait pas arriver avec email confirmation OFF, mais on gère quand même
        toast({
          title: "Vérifiez vos emails",
          description: "Un lien de confirmation vous a été envoyé.",
        });
        return;
      }

      // 2. Insérer le profil avec l'id récupéré
      //    ✅ On utilise upsert pour éviter les doublons si jamais la fonction est appelée deux fois
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: fullName,
        username: username,
        email: email,
        updated_at: new Date().toISOString(),
      });

      if (profileError) {
        console.error("Profile insert error:", profileError);
        // Le compte auth est créé, on redirige quand même mais on prévient
        toast({
          title: "Profil incomplet",
          description: "Compte créé mais le profil n'a pas pu être sauvegardé. Contactez le support.",
          variant: "destructive",
        });
        // On tente quand même la navigation car l'auth a réussi
        navigate("/");
        return;
      }

      // 3. Avec email confirmation OFF, l'utilisateur est déjà connecté après signUp.
      //    Pas besoin de re-signIn — ça casserait la session.
      //    onAuthStateChange dans AuthContext a déjà mis à jour user/session.
      toast({
        title: "Bienvenue sur GameSwap ! 🎲",
        description: `Bonjour ${fullName.split(" ")[0]} !`,
      });
      navigate("/");

    } catch (err) {
      console.error("Auth error:", err);
      toast({
        title: "Erreur inattendue",
        description: "Veuillez réessayer dans quelques instants.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Reset état quand on bascule login/signup ─────────────────────────────────
  const handleToggleMode = () => {
    setIsLogin((prev) => !prev);
    setEmail("");
    setPassword("");
    setFullName("");
    setUsername("");
    setUsernameAvailable(null);
  };

  // ── Indicateur username ──────────────────────────────────────────────────────
  const renderUsernameHint = () => {
    if (username.length < 3) return null;
    if (checkingUsername) return <p className="text-xs text-muted-foreground mt-1">Vérification...</p>;
    if (usernameAvailable === true) return <p className="text-xs text-green-600 mt-1">✓ Pseudo disponible</p>;
    if (usernameAvailable === false) return <p className="text-xs text-destructive mt-1">✗ Pseudo déjà pris</p>;
    return null;
  };

  // ── Render ───────────────────────────────────────────────────────────────────
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
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Marie Dupont"
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="username">Pseudo (unique)</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                  }
                  placeholder="marie_dupont"
                  className="mt-1"
                  required
                  minLength={3}
                />
                {renderUsernameHint()}
              </div>
            </>
          )}

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="marie@exemple.fr"
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 caractères"
              className="mt-1"
              required
              minLength={6}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || (!isLogin && checkingUsername)}
          >
            {loading
              ? "Chargement..."
              : isLogin
              ? "Se connecter"
              : "Créer mon compte"}
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}{" "}
          <button
            type="button"
            onClick={handleToggleMode}
            className="text-primary font-semibold hover:underline"
          >
            {isLogin ? "S'inscrire" : "Se connecter"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
