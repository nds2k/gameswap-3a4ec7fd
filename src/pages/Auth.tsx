import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DecorativeBlobs } from "@/components/layout/DecorativeBlobs";
import { Mail, Lock, User, ArrowRight } from "lucide-react";
import logo from "@/assets/gameswap-logo.png";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signInWithEmail(email, password);
        if (error) {
          toast({ title: "Erreur de connexion", description: "Email ou mot de passe invalide.", variant: "destructive" });
          return;
        }
        navigate("/");
      } else {
        const { error } = await signUpWithEmail(email, password, fullName || "Utilisateur");
        if (error) {
          if (error.message.includes("already registered")) {
            toast({ title: "Compte existant", description: "Email déjà utilisé, connectez-vous.", variant: "destructive" });
          } else {
            toast({ title: "Erreur d'inscription", description: error.message, variant: "destructive" });
          }
          return;
        }
        toast({ title: "Compte créé !", description: "Bienvenue !" });
        navigate("/");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <DecorativeBlobs />

      {/* Logo */}
      <div className="mb-8">
        <img src={logo} alt="GameSwap" className="w-20 h-20 rounded-2xl shadow-lg" />
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md bg-card rounded-3xl border border-border p-6 shadow-soft">
        <div className="flex items-center gap-2 mb-6">
          <User className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-lg">{isLogin ? "Connexion" : "Créer un compte"}</h2>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          {!isLogin && (
            <div>
              <Label htmlFor="fullName">Nom complet</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Ex: Nicolas"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1"
              />
            </div>
          )}

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="ton@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Chargement..." : isLogin ? "Se connecter" : "Créer le compte"} <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
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
    </div>
  );
};

export default Auth;
