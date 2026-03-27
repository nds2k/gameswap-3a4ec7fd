import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const JoinGroup = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "already_member">("loading");
  const [groupName, setGroupName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Store the invite link and redirect to auth
      sessionStorage.setItem("pendingGroupInvite", conversationId || "");
      navigate("/auth");
      return;
    }

    if (conversationId) {
      joinGroup();
    }
  }, [user, authLoading, conversationId]);

  const joinGroup = async () => {
    if (!conversationId || !user) return;

    try {
      // Check if conversation exists and is a group
      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .select("id, name, is_group")
        .eq("id", conversationId)
        .maybeSingle();

      if (convError || !conversation) {
        setError("Ce groupe n'existe pas ou le lien est invalide.");
        setStatus("error");
        return;
      }

      if (!conversation.is_group) {
        setError("Ce lien n'est pas un lien de groupe valide.");
        setStatus("error");
        return;
      }

      setGroupName(conversation.name);

      // Check if already a member
      const { data: existingMember } = await supabase
        .from("conversation_participants")
        .select("id")
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingMember) {
        setStatus("already_member");
        return;
      }

      // Add user to the group
      const { error: joinError } = await supabase
        .from("conversation_participants")
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
        });

      if (joinError) throw joinError;

      setStatus("success");
      toast({
        title: "Vous avez rejoint le groupe !",
        description: `Bienvenue dans "${conversation.name || "le groupe"}"`,
      });
    } catch (error: any) {
      console.error("Error joining group:", error);
      setError(error.message || "Impossible de rejoindre le groupe.");
      setStatus("error");
    }
  };

  const goToMessages = () => {
    navigate(`/messages?conversation=${conversationId}`);
  };

  const goHome = () => {
    navigate("/");
  };

  if (authLoading || status === "loading") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
        </div>
        <h1 className="text-xl font-bold mb-2">Rejoindre le groupe...</h1>
        <p className="text-muted-foreground text-center">Veuillez patienter</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
          <CheckCircle className="h-10 w-10 text-green-500" />
        </div>
        <h1 className="text-xl font-bold mb-2">Bienvenue dans le groupe !</h1>
        <p className="text-muted-foreground text-center mb-6">
          Vous avez rejoint "{groupName || "le groupe"}"
        </p>
        <Button onClick={goToMessages} variant="gameswap" className="w-full max-w-xs">
          <Users className="h-4 w-4 mr-2" />
          Accéder au groupe
        </Button>
      </div>
    );
  }

  if (status === "already_member") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Users className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-xl font-bold mb-2">Vous êtes déjà membre !</h1>
        <p className="text-muted-foreground text-center mb-6">
          Vous faites déjà partie de "{groupName || "ce groupe"}"
        </p>
        <Button onClick={goToMessages} variant="gameswap" className="w-full max-w-xs">
          <Users className="h-4 w-4 mr-2" />
          Accéder au groupe
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
        <XCircle className="h-10 w-10 text-destructive" />
      </div>
      <h1 className="text-xl font-bold mb-2">Erreur</h1>
      <p className="text-muted-foreground text-center mb-6">{error}</p>
      <Button onClick={goHome} variant="outline" className="w-full max-w-xs">
        Retour à l'accueil
      </Button>
    </div>
  );
};

export default JoinGroup;