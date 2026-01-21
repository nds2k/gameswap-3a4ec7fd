import { FriendWithProfile } from "@/hooks/useFriends";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2, Clock } from "lucide-react";
import { useState } from "react";

interface FriendRequestsProps {
  received: FriendWithProfile[];
  sent: FriendWithProfile[];
  loading: boolean;
  onRespond: (friendshipId: string, accept: boolean) => Promise<{ error: Error | null }>;
  onCancel: (friendshipId: string) => Promise<{ error: Error | null }>;
}

export const FriendRequests = ({ 
  received, 
  sent, 
  loading, 
  onRespond,
  onCancel,
}: FriendRequestsProps) => {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleRespond = async (friendshipId: string, accept: boolean) => {
    setActionLoading(friendshipId);
    await onRespond(friendshipId, accept);
    setActionLoading(null);
  };

  const handleCancel = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    await onCancel(friendshipId);
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (received.length === 0 && sent.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Aucune demande d'ami en attente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {received.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">Demandes reçues</h3>
          <div className="space-y-3">
            {received.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-4 bg-card rounded-xl border border-border"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={request.friend.avatar_url || undefined} />
                    <AvatarFallback>
                      {request.friend.full_name?.[0] || request.friend.username?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{request.friend.full_name || "Utilisateur"}</p>
                    {request.friend.username && (
                      <p className="text-sm text-muted-foreground">@{request.friend.username}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="gameswap"
                    size="sm"
                    onClick={() => handleRespond(request.id, true)}
                    disabled={actionLoading === request.id}
                  >
                    {actionLoading === request.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRespond(request.id, false)}
                    disabled={actionLoading === request.id}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sent.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">Demandes envoyées</h3>
          <div className="space-y-3">
            {sent.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-4 bg-card rounded-xl border border-border"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={request.friend.avatar_url || undefined} />
                    <AvatarFallback>
                      {request.friend.full_name?.[0] || request.friend.username?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{request.friend.full_name || "Utilisateur"}</p>
                    {request.friend.username && (
                      <p className="text-sm text-muted-foreground">@{request.friend.username}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    En attente
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancel(request.id)}
                    disabled={actionLoading === request.id}
                    className="text-destructive hover:text-destructive"
                  >
                    {actionLoading === request.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
