import { FriendWithProfile } from "@/hooks/useFriends";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { UserMinus, MessageSquare, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

interface FriendsListProps {
  friends: FriendWithProfile[];
  loading: boolean;
  onRemove: (friendshipId: string) => Promise<{ error: Error | null }>;
}

export const FriendsList = ({ friends, loading, onRemove }: FriendsListProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleMessage = async (friendUserId: string) => {
    if (!user) return;
    
    setActionLoading(friendUserId);
    try {
      // Check if a conversation already exists
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
      for (const convoId of userConvoIds) {
        if (friendConvoIds.includes(convoId)) {
          const { data: convo } = await supabase
            .from("conversations")
            .select("is_group")
            .eq("id", convoId)
            .single();
          
          if (convo && !convo.is_group) {
            navigate(`/chat/${convoId}`);
            return;
          }
        }
      }

      // Create new conversation
      const { data: newConvo, error: convoError } = await supabase
        .from("conversations")
        .insert({ is_group: false })
        .select()
        .single();

      if (convoError) throw convoError;

      // Add participants
      await supabase.from("conversation_participants").insert([
        { conversation_id: newConvo.id, user_id: user.id },
        { conversation_id: newConvo.id, user_id: friendUserId },
      ]);

      navigate(`/chat/${newConvo.id}`);
    } catch (error) {
      console.error("Error creating conversation:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    await onRemove(friendshipId);
    setActionLoading(null);
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
    <div className="space-y-3">
      {friends.map((friendship) => (
        <div
          key={friendship.id}
          className="flex items-center justify-between p-4 bg-card rounded-xl border border-border"
        >
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={friendship.friend.avatar_url || undefined} />
              <AvatarFallback>
                {friendship.friend.full_name?.[0] || friendship.friend.username?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{friendship.friend.full_name || "Utilisateur"}</p>
              {friendship.friend.username && (
                <p className="text-sm text-muted-foreground">@{friendship.friend.username}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleMessage(friendship.friend.user_id)}
              disabled={actionLoading === friendship.friend.user_id}
            >
              {actionLoading === friendship.friend.user_id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageSquare className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRemove(friendship.id)}
              disabled={actionLoading === friendship.id}
              className="text-destructive hover:text-destructive"
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
  );
};
