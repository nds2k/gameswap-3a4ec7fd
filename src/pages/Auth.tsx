import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DecorativeBlobs } from "@/components/layout/DecorativeBlobs";
import { Mail, Lock, User, ArrowRight, Plus, Users, RefreshCw } from "lucide-react";
import logo from "@/assets/gameswap-logo.png";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
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
        const { error } = await signUpWithEmail(email, password, fullName);
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
            description: "Bienvenue sur GameSwap !",
          });
          navigate("/");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast({
        title: "Erreur Google",
        description: error.message,
        variant: "destructive",
      });
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
          Bienvenue sur <span className="text-primary">GameSwap</span>
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
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">ou</span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleGoogleAuth}
          disabled={loading}
        >
          <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continuer avec Google
        </Button>

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
