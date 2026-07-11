import { MessageCircle, Users, Plus, UserPlus, Check, CheckCheck, MessageSquare, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMessages } from "@/hooks/useMessages";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { CreateGroupModal } from "@/components/messages/CreateGroupModal";
import { StartConversationModal } from "@/components/friends/StartConversationModal";
import { OnlineStatusDot } from "@/components/chat/OnlineStatusDot";
import { FriendWithProfile } from "@/hooks/useFriends";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MessagesTabProps {
  friends?: FriendWithProfile[];
}

export const MessagesTab = ({ friends = [] }: MessagesTabProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { conversations, loading, refreshConversations } = useMessages();
  const { isOnline } = useOnlinePresence();

  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [startConvoOpen, setStartConvoOpen] = useState(false);
  const [hiddenConversations, setHiddenConversations] = useState<Set<string>>(new Set());

  const getConversationDisplay = (conversation: typeof conversations[0]) => {
    if (conversation.is_group) {
      const onlineCount = conversation.participants.filter(p => 
        p.user_id !== user?.id && isOnline(p.user_id)
      ).length;
      
      return {
        name: conversation.name || "Groupe",
        image: conversation.image_url,
        initials: (conversation.name || "G").charAt(0).toUpperCase(),
        subtitle: onlineCount > 0 
          ? `${onlineCount} en ligne • ${conversation.participants.length} membres`
          : `${conversation.participants.length} membres`,
        isOnline: onlineCount > 0,
        otherUserId: null,
      };
    }
    const other = conversation.participants.find((p) => p.user_id !== user?.id);
    const otherIsOnline = other ? isOnline(other.user_id) : false;
    return {
      name: other?.profile?.full_name || "Utilisateur",
      image: other?.profile?.avatar_url,
      initials: (other?.profile?.full_name || "?").charAt(0).toUpperCase(),
      subtitle: otherIsOnline ? "En ligne" : "Hors ligne",
      isOnline: otherIsOnline,
      otherUserId: other?.user_id || null,
    };
  };

  const handleConversationClick = (conversationId: string, isGroup: boolean) => {
    if (isGroup) {
      navigate(`/group/${conversationId}`);
    } else {
      navigate(`/chat/${conversationId}`);
    }
  };

  const handleGroupCreated = (conversationId: string) => {
    refreshConversations();
    navigate(`/group/${conversationId}`);
  };

  const handleHideConversation = async (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    // Remove user from conversation_participants to hide it
    if (!user) return;
    
    const { error } = await supabase
      .from("conversation_participants")
      .delete()
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      setHiddenConversations(prev => new Set(prev).add(conversationId));
      toast.success("Conversation supprimée");
      refreshConversations();
    }
  };

  // Helper to detect encrypted content
  const isEncryptedContent = (content: string | undefined) => {
    if (!content) return false;
    try {
      const parsed = JSON.parse(content);
      return parsed && parsed.iv && parsed.data;
    } catch {
      return false;
    }
  };

  const getDisplayContent = (conversation: typeof conversations[0]) => {
    const lastMsg = conversation.last_message;
    if (!lastMsg) return "Nouvelle conversation";
    
    if (isEncryptedContent(lastMsg.content)) {
      return "🔒 Message chiffré";
    }
    
    const prefix = lastMsg.sender_id === user?.id ? "Vous: " : "";
    return prefix + lastMsg.content;
  };

  const visibleConversations = conversations.filter(c => !hiddenConversations.has(c.id));

  return (
    <div>
      {/* Header with buttons */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-muted-foreground">
          {visibleConversations.length} conversation{visibleConversations.length !== 1 ? "s" : ""}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setStartConvoOpen(true)}>
            <UserPlus className="h-4 w-4 mr-1" />
            Nouvelle
          </Button>
          <Button variant="gameswap" size="sm" onClick={() => setCreateGroupOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Groupe
          </Button>
        </div>
      </div>

      {/* Conversations */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-muted" />
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : visibleConversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
            <MessageCircle className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Aucune conversation</h3>
          <p className="text-muted-foreground mb-4">Contactez un vendeur ou créez un groupe</p>
          <Button variant="gameswap" onClick={() => setCreateGroupOpen(true)}>
            <Users className="h-4 w-4 mr-2" />
            Créer un groupe
          </Button>
        </div>
      ) : (
        <div className="space-y-2 animate-fade-in">
          {visibleConversations.map((conversation) => {
            const display = getConversationDisplay(conversation);

            return (
              <div
                key={conversation.id}
                className="w-full bg-card rounded-2xl border border-border p-4 flex items-center gap-4 hover:border-primary/50 transition-all group/conv"
              >
                {/* Avatar */}
                <div 
                  className={`relative ${!conversation.is_group && display.otherUserId ? 'cursor-pointer' : ''}`}
                  onClick={(e) => {
                    if (!conversation.is_group && display.otherUserId) {
                      e.stopPropagation();
                      navigate(`/user/${display.otherUserId}`);
                    }
                  }}
                >
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                    {display.image ? (
                      <img src={display.image} alt="" className="w-full h-full object-cover" />
                    ) : conversation.is_group ? (
                      <Users className="h-5 w-5 text-primary" />
                    ) : (
                      <span className="font-bold text-primary">{display.initials}</span>
                    )}
                  </div>
                  <OnlineStatusDot isOnline={display.isOnline} size="md" className="absolute bottom-0 right-0" />
                  {conversation.unread_count > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                      {conversation.unread_count}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => handleConversationClick(conversation.id, conversation.is_group)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{display.name}</h3>
                      {conversation.is_group && (
                        <span className="px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded">Groupe</span>
                      )}
                    </div>
                    {conversation.last_message && (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(conversation.last_message.created_at), { addSuffix: false, locale: fr })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {conversation.last_message?.sender_id === user?.id && !isEncryptedContent(conversation.last_message?.content) && (
                      <span className="flex-shrink-0">
                        {conversation.last_message.read_at ? (
                          <CheckCheck className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <Check className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </span>
                    )}
                    <p className="text-sm text-muted-foreground truncate flex-1">
                      {getDisplayContent(conversation)}
                    </p>
                  </div>
                </div>

                {/* Delete conversation button */}
                <button
                  onClick={(e) => handleHideConversation(e, conversation.id)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover/conv:opacity-100 flex-shrink-0"
                  title="Supprimer la conversation"
                >
                  <X className="h-4 w-4" />
                </button>

                {/* Message bubble button */}
                <button
                  onClick={() => handleConversationClick(conversation.id, conversation.is_group)}
                  className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors flex-shrink-0"
                  title="Ouvrir la conversation"
                >
                  <MessageSquare className="h-5 w-5 text-primary" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <CreateGroupModal open={createGroupOpen} onOpenChange={setCreateGroupOpen} onSuccess={handleGroupCreated} />
      <StartConversationModal
        open={startConvoOpen}
        onOpenChange={setStartConvoOpen}
        friends={friends}
        onConversationStarted={(convoId) => {
          refreshConversations();
          navigate(`/chat/${convoId}`);
        }}
      />
    </div>
  );
};
