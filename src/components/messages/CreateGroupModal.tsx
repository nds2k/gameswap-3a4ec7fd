import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Search, Users, Loader2, X, Camera, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (conversationId: string) => void;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export const CreateGroupModal = ({ open, onOpenChange, onSuccess }: CreateGroupModalProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupImage, setGroupImage] = useState<File | null>(null);
  const [groupImagePreview, setGroupImagePreview] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (open) {
      setGroupName("");
      setGroupImage(null);
      setGroupImagePreview(null);
      setSearchQuery("");
      setSearchResults([]);
      setSelectedUsers([]);
    }
  }, [open]);

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from("public_profiles")
        .select("id, user_id, full_name, avatar_url")
        .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
        .neq("user_id", user?.id || "")
        .limit(10);

      if (error) throw error;

      // Filter out already selected users
      const filtered = (data || []).filter(
        (profile) => !selectedUsers.some((u) => u.user_id === profile.user_id)
      );
      setSearchResults(filtered);
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchQuery) {
        searchUsers(searchQuery);
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, selectedUsers]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setGroupImage(file);
      setGroupImagePreview(URL.createObjectURL(file));
    }
  };

  const addUser = (profile: UserProfile) => {
    setSelectedUsers([...selectedUsers, profile]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u.user_id !== userId));
  };

  const handleCreate = async () => {
    if (!user) {
      toast({
        title: "Non connecté",
        description: "Veuillez vous connecter pour créer un groupe.",
        variant: "destructive",
      });
      return;
    }

    if (!groupName.trim()) {
      toast({
        title: "Nom requis",
        description: "Veuillez entrer un nom pour le groupe.",
        variant: "destructive",
      });
      return;
    }

    if (selectedUsers.length < 1) {
      toast({
        title: "Membres requis",
        description: "Veuillez ajouter au moins un membre au groupe.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Upload group image if provided
      let imageUrl: string | null = null;
      if (groupImage) {
        const fileExt = groupImage.name.split(".").pop();
        const fileName = `group_${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, groupImage);

        if (uploadError) throw uploadError;

        const { data: publicUrl } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);
        imageUrl = publicUrl.publicUrl;
      }

      // Create the conversation
      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .insert({
          name: groupName.trim(),
          image_url: imageUrl,
          is_group: true,
          created_by: user.id,
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add all participants (including current user)
      const participants = [
        { conversation_id: conversation.id, user_id: user.id },
        ...selectedUsers.map((u) => ({
          conversation_id: conversation.id,
          user_id: u.user_id,
        })),
      ];

      const { error: partError } = await supabase
        .from("conversation_participants")
        .insert(participants);

      if (partError) throw partError;

      toast({
        title: "Groupe créé",
        description: `Le groupe "${groupName}" a été créé avec ${selectedUsers.length + 1} membres.`,
      });

      onOpenChange(false);
      onSuccess?.(conversation.id);
    } catch (error: any) {
      console.error("Error creating group:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le groupe.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Créer un groupe
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Group Image */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-border">
                {groupImagePreview ? (
                  <img
                    src={groupImagePreview}
                    alt="Group"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Users className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors">
                <Camera className="h-4 w-4" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                />
              </label>
            </div>
          </div>

          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="groupName">Nom du groupe</Label>
            <Input
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Ex: Soirée jeux du samedi"
              maxLength={50}
            />
          </div>

          {/* Selected Members */}
          {selectedUsers.length > 0 && (
            <div className="space-y-2">
              <Label>Membres sélectionnés ({selectedUsers.length})</Label>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((profile) => (
                  <div
                    key={profile.user_id}
                    className="flex items-center gap-2 bg-primary/10 text-primary rounded-full pl-1 pr-2 py-1"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {(profile.full_name || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {profile.full_name || "Utilisateur"}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeUser(profile.user_id)}
                      className="w-4 h-4 rounded-full hover:bg-primary/20 flex items-center justify-center"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Users */}
          <div className="space-y-2">
            <Label>Ajouter des membres</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher des utilisateurs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
              )}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                {searchResults.map((profile) => (
                  <button
                    key={profile.user_id}
                    type="button"
                    onClick={() => addUser(profile)}
                    className="w-full p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback>
                        {(profile.full_name || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{profile.full_name || "Utilisateur"}</p>
                    </div>
                    <div className="w-6 h-6 rounded-full border-2 border-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Create Button */}
          <Button
            onClick={handleCreate}
            disabled={loading || !groupName.trim() || selectedUsers.length < 1}
            className="w-full"
            variant="gameswap"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Création...
              </>
            ) : (
              <>
                <Users className="h-4 w-4 mr-2" />
                Créer le groupe ({selectedUsers.length + 1} membres)
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
