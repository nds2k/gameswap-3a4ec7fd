import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, Loader2, X, Camera, UserPlus, LogOut, 
  Edit2, Check, Search, ExternalLink, Copy
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

interface GroupSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  onLeaveGroup?: () => void;
}

interface Participant {
  user_id: string;
  profile: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export const GroupSettingsSheet = ({ 
  open, 
  onOpenChange, 
  conversationId,
  onLeaveGroup 
}: GroupSettingsSheetProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [conversation, setConversation] = useState<{
    name: string | null;
    image_url: string | null;
    is_group: boolean;
    created_by: string | null;
  } | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [newImage, setNewImage] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  
  // Add member state
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (open && conversationId) {
      fetchConversationDetails();
    }
  }, [open, conversationId]);

  const fetchConversationDetails = async () => {
    setLoading(true);
    try {
      // Fetch conversation
      const { data: convData, error: convError } = await supabase
        .from("conversations")
        .select("name, image_url, is_group, created_by")
        .eq("id", conversationId)
        .single();

      if (convError) throw convError;
      setConversation(convData);
      setNewName(convData.name || "");

      // Fetch participants with profiles
      const { data: partData, error: partError } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conversationId);

      if (partError) throw partError;

      // Fetch profiles for participants using security definer function
      const userIds = partData.map(p => p.user_id);
      const { data: allProfiles, error: profError } = await supabase.rpc("get_public_profiles");

      if (profError) throw profError;

      // Filter to only participants
      const profiles = (allProfiles || []).filter(p => userIds.includes(p.user_id));

      const participantsWithProfiles = partData.map(p => ({
        user_id: p.user_id,
        profile: profiles?.find(pr => pr.user_id === p.user_id) || null
      }));

      setParticipants(participantsWithProfiles);
    } catch (error) {
      console.error("Error fetching conversation:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewImage(file);
      setNewImagePreview(URL.createObjectURL(file));
    }
  };

  const saveName = async () => {
    if (!newName.trim()) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("conversations")
        .update({ name: newName.trim() })
        .eq("id", conversationId);

      if (error) throw error;

      setConversation(prev => prev ? { ...prev, name: newName.trim() } : null);
      setEditingName(false);
      toast({ title: "Nom mis à jour" });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveImage = async () => {
    if (!newImage) return;

    setSaving(true);
    try {
      const fileExt = newImage.name.split(".").pop();
      const fileName = `group_${conversationId}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, newImage);

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const { error } = await supabase
        .from("conversations")
        .update({ image_url: publicUrl.publicUrl })
        .eq("id", conversationId);

      if (error) throw error;

      setConversation(prev => prev ? { ...prev, image_url: publicUrl.publicUrl } : null);
      setNewImage(null);
      setNewImagePreview(null);
      toast({ title: "Image mise à jour" });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      // Use security definer function for public profile access
      const { data, error } = await supabase.rpc("get_public_profiles");

      if (error) throw error;

      // Filter by search query and exclude existing participants
      const queryLower = query.toLowerCase();
      const existingUserIds = participants.map(p => p.user_id);
      const filtered = (data || [])
        .filter(
          (profile) =>
            (profile.full_name?.toLowerCase().includes(queryLower) ||
              profile.username?.toLowerCase().includes(queryLower)) &&
            !existingUserIds.includes(profile.user_id)
        )
        .slice(0, 10) as UserProfile[];

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
  }, [searchQuery]);

  const addMember = async (profile: UserProfile) => {
    try {
      const { error } = await supabase
        .from("conversation_participants")
        .insert({
          conversation_id: conversationId,
          user_id: profile.user_id,
        });

      if (error) throw error;

      setParticipants([...participants, {
        user_id: profile.user_id,
        profile: {
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
        }
      }]);
      setSearchQuery("");
      setSearchResults([]);
      toast({ title: `${profile.full_name || "Utilisateur"} ajouté au groupe` });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const leaveGroup = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("conversation_participants")
        .delete()
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({ title: "Vous avez quitté le groupe" });
      onOpenChange(false);
      onLeaveGroup?.();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const isCreator = conversation?.created_by === user?.id;
  const displayImage = newImagePreview || conversation?.image_url;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Paramètres du groupe
          </SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-6">
            {/* Group Image */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {displayImage ? (
                    <img
                      src={displayImage}
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

            {newImage && (
              <div className="flex justify-center">
                <Button onClick={saveImage} disabled={saving} size="sm">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Enregistrer l'image
                </Button>
              </div>
            )}

            {/* Group Name */}
            <div className="space-y-2">
              <Label>Nom du groupe</Label>
              {editingName ? (
                <div className="flex gap-2">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nom du groupe"
                    maxLength={50}
                  />
                  <Button onClick={saveName} disabled={saving} size="icon">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </Button>
                  <Button onClick={() => setEditingName(false)} variant="ghost" size="icon">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="flex-1 font-medium">{conversation?.name || "Groupe sans nom"}</p>
                  <Button onClick={() => setEditingName(true)} variant="ghost" size="icon">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Invite Link */}
            <div className="space-y-2">
              <Label>Inviter des amis</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${window.location.origin}/join/${conversationId}`}
                  className="text-sm bg-muted/50"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/join/${conversationId}`);
                    toast({ title: "Lien copié !" });
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Partagez ce lien pour inviter des amis à rejoindre le groupe
              </p>
            </div>

            <Separator />

            {/* Members */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Membres ({participants.length})</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddMember(!showAddMember)}
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Ajouter
                </Button>
              </div>

              {/* Add Member Search */}
              {showAddMember && (
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                    {searching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                    )}
                  </div>
                  {searchResults.length > 0 && (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {searchResults.map((profile) => (
                        <button
                          key={profile.user_id}
                          onClick={() => addMember(profile)}
                          className="w-full p-2 flex items-center gap-2 hover:bg-muted rounded-lg transition-colors text-left"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={profile.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {(profile.full_name || "?").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">
                            {profile.full_name || "Utilisateur"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Members List */}
              <div className="space-y-2">
                {participants.map((participant) => (
                  <div
                    key={participant.user_id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={participant.profile?.avatar_url || undefined} />
                      <AvatarFallback>
                        {(participant.profile?.full_name || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">
                        {participant.profile?.full_name || "Utilisateur"}
                      </p>
                      {participant.user_id === conversation?.created_by && (
                        <p className="text-xs text-primary">Créateur</p>
                      )}
                      {participant.user_id === user?.id && (
                        <p className="text-xs text-muted-foreground">Vous</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Leave Group */}
            <Button
              variant="destructive"
              onClick={leaveGroup}
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Quitter le groupe
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
