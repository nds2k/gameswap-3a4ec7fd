import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Loader2 } from "lucide-react";
import { FriendWithProfile } from "@/hooks/useFriends";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface StartConversationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  friends: FriendWithProfile[];
  onConversationStarted: (conversationId: string) => void;
}

export const StartConversationModal = ({
  open,
  onOpenChange,
  friends,
  onConversationStarted,
}: StartConversationModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelectFriend = async (friendUserId: string) => {
    if (!user) return;

    setLoading(friendUserId);
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

      const userConvoIds = existingConvos?.map((c) => c.conversation_id) || [];
      const friendConvoIds = friendConvos?.map((c) => c.conversation_id) || [];

      // Find common non-group conversations
      for (const convoId of userConvoIds) {
        if (friendConvoIds.includes(convoId)) {
          const { data: convo } = await supabase
            .from("conversations")
            .select("is_group")
            .eq("id", convoId)
            .single();

          if (convo && !convo.is_group) {
            onConversationStarted(convoId);
            onOpenChange(false);
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

      onConversationStarted(newConvo.id);
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating conversation:", error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Nouvelle conversation
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2">
          {friends.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Vous n'avez pas encore d'amis.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Ajoutez des amis pour démarrer une conversation !
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {friends.map((friendship) => (
                <button
                  key={friendship.id}
                  onClick={() => handleSelectFriend(friendship.friend.user_id)}
                  disabled={loading === friendship.friend.user_id}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors disabled:opacity-50"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={friendship.friend.avatar_url || undefined} />
                    <AvatarFallback>
                      {friendship.friend.full_name?.[0] ||
                        friendship.friend.username?.[0] ||
                        "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="font-medium">
                      {friendship.friend.full_name || "Utilisateur"}
                    </p>
                    {friendship.friend.username && (
                      <p className="text-sm text-muted-foreground">
                        @{friendship.friend.username}
                      </p>
                    )}
                  </div>
                  {loading === friendship.friend.user_id ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : (
                    <MessageCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
