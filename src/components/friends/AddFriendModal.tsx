import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, UserPlus, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FriendWithProfile } from "@/hooks/useFriends";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface AddFriendModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendRequest: (addresseeId: string) => Promise<{ error: Error | null }>;
  existingFriends: FriendWithProfile[];
  pendingSent: FriendWithProfile[];
}

export const AddFriendModal = ({ 
  open, 
  onOpenChange, 
  onSendRequest,
  existingFriends,
  pendingSent,
}: AddFriendModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  useEffect(() => {
    if (!search.trim() || search.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await supabase.rpc("get_public_profiles");
        
        const filtered = data?.filter((p) => {
          if (p.user_id === user?.id) return false;
          const searchLower = search.toLowerCase();
          return (
            p.username?.toLowerCase().includes(searchLower) ||
            p.full_name?.toLowerCase().includes(searchLower)
          );
        }) || [];
        
        setResults(filtered.slice(0, 10));
      } catch (error) {
        console.error("Error searching users:", error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search, user?.id]);

  const isAlreadyFriend = (userId: string) => {
    return existingFriends.some((f) => f.friend.user_id === userId);
  };

  const isPendingSent = (userId: string) => {
    return pendingSent.some((f) => f.friend.user_id === userId);
  };

  const handleSendRequest = async (profile: Profile) => {
    setSendingTo(profile.user_id);
    const { error } = await onSendRequest(profile.user_id);
    
    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la demande d'ami.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Demande envoyée !",
        description: `Demande d'ami envoyée à ${profile.full_name || profile.username}.`,
      });
    }
    
    setSendingTo(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un ami</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou @pseudo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="max-h-[300px] overflow-y-auto space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && search.length >= 2 && results.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Aucun utilisateur trouvé
            </p>
          )}

          {!loading && results.map((profile) => {
            const isFriend = isAlreadyFriend(profile.user_id);
            const isPending = isPendingSent(profile.user_id);
            
            return (
              <div
                key={profile.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback>
                      {profile.full_name?.[0] || profile.username?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{profile.full_name || "Utilisateur"}</p>
                    {profile.username && (
                      <p className="text-sm text-muted-foreground">@{profile.username}</p>
                    )}
                  </div>
                </div>
                
                {isFriend ? (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Check className="h-4 w-4" />
                    Ami
                  </span>
                ) : isPending ? (
                  <span className="text-sm text-muted-foreground">En attente</span>
                ) : (
                  <Button
                    variant="gameswap"
                    size="sm"
                    onClick={() => handleSendRequest(profile)}
                    disabled={sendingTo === profile.user_id}
                  >
                    {sendingTo === profile.user_id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
