import { FriendWithProfile } from "@/hooks/useFriends";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { UserMinus, MessageSquare, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";
import { OnlineStatusDot } from "@/components/chat/OnlineStatusDot";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FriendsListProps {
  friends: FriendWithProfile[];
  loading: boolean;
  onRemove: (friendshipId: string) => Promise<{ error: Error | null }>;
}

export const FriendsList = ({ friends, loading, onRemove }: FriendsListProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOnline } = useOnlinePresence();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [friendToRemove, setFriendToRemove] = useState<FriendWithProfile | null>(null);

  const handleMessage = async (friendUserId: string) => {
    if (!user) return;
    
    setActionLoading(friendUserId);
    try {
      // Check if a conversation already exists between these two users
      const { data: existingConvos } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      const { data: friendConvos } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", friendUserId);

      const userConvoIds = existingConvos?.map(c => c.conversation_id) || [];
      const friendConvoIds = friendConvos?.map(c => c.conversation_id) || [];
      
      // Find common non-group conversations
      const commonConvoIds = userConvoIds.filter(id => friendConvoIds.includes(id));
      
      for (const convoId of commonConvoIds) {
        const { data: convo } = await supabase
          .from("conversations")
          .select("is_group")
          .eq("id", convoId)
          .maybeSingle();
        
        if (convo && !convo.is_group) {
          navigate(`/chat/${convoId}`);
          return;
        }
      }

      // No existing conversation found, create a new one
      const { data: newConvo, error: convoError } = await supabase
        .from("conversations")
        .insert({ is_group: false, created_by: user.id })
        .select()
        .single();

      if (convoError) {
        console.error("Error creating conversation:", convoError);
        return;
      }

      // Add both participants
      const { error: participantError } = await supabase
        .from("conversation_participants")
        .insert([
          { conversation_id: newConvo.id, user_id: user.id },
          { conversation_id: newConvo.id, user_id: friendUserId },
        ]);

      if (participantError) {
        console.error("Error adding participants:", participantError);
        return;
      }

      navigate(`/chat/${newConvo.id}`);
    } catch (error) {
      console.error("Error in handleMessage:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmRemove = async () => {
    if (!friendToRemove) return;
    setActionLoading(friendToRemove.id);
    await onRemove(friendToRemove.id);
    setActionLoading(null);
    setFriendToRemove(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Vous n'avez pas encore d'amis.</p>
        <p className="text-sm text-muted-foreground mt-1">
          Ajoutez des amis pour voir leurs jeux !
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {friends.map((friendship) => (
          <div
            key={friendship.id}
            className="flex items-center justify-between p-4 bg-card rounded-xl border border-border hover:border-primary/50 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div 
                className="relative cursor-pointer"
                onClick={() => navigate(`/user/${friendship.friend.user_id}`)}
              >
                <Avatar className="h-12 w-12 ring-2 ring-transparent hover:ring-primary/30 transition-all">
                  <AvatarImage src={friendship.friend.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {friendship.friend.full_name?.[0] || friendship.friend.username?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <OnlineStatusDot 
                  isOnline={isOnline(friendship.friend.user_id)} 
                  size="md"
                  className="absolute bottom-0 right-0"
                />
                {actionLoading === friendship.friend.user_id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <div
                className="cursor-pointer"
                onClick={() => navigate(`/user/${friendship.friend.user_id}`)}
              >
                <p className="font-medium hover:text-primary transition-colors">
                  {friendship.friend.full_name || "Utilisateur"}
                </p>
                {friendship.friend.username && (
                  <p className="text-sm text-muted-foreground">@{friendship.friend.username}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleMessage(friendship.friend.user_id)}
                disabled={actionLoading === friendship.friend.user_id}
                className="text-primary hover:text-primary hover:bg-primary/10"
              >
                <MessageSquare className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setFriendToRemove(friendship);
                }}
                disabled={actionLoading === friendship.id}
                className="text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {actionLoading === friendship.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserMinus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <AlertDialog open={!!friendToRemove} onOpenChange={(open) => !open && setFriendToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet ami ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir retirer{" "}
              <span className="font-semibold">
                {friendToRemove?.friend.full_name || friendToRemove?.friend.username || "cet utilisateur"}
              </span>{" "}
              de votre liste d'amis ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
