import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Camera, Upload, MapPin, Save, Loader2, User } from "lucide-react";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  location_lat: number | null;
  location_lng: number | null;
  show_on_map: boolean | null;
}

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [showOnMap, setShowOnMap] = useState(true);
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchProfile();
  }, [user, navigate]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setProfile(data);
        setFullName(data.full_name || "");
        setUsername(data.username || "");
        setShowOnMap(data.show_on_map ?? true);
        setLocationLat(data.location_lat);
        setLocationLng(data.location_lng);
        setAvatarUrl(data.avatar_url);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger le profil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une image",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erreur",
        description: "L'image ne doit pas dépasser 5 Mo",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Delete old avatar if exists
      await supabase.storage.from("avatars").remove([fileName]);

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const newAvatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      setAvatarUrl(newAvatarUrl);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: newAvatarUrl })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      toast({
        title: "Photo mise à jour",
        description: "Votre photo de profil a été modifiée",
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la photo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Erreur",
        description: "La géolocalisation n'est pas supportée par votre navigateur",
        variant: "destructive",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationLat(position.coords.latitude);
        setLocationLng(position.coords.longitude);
        toast({
          title: "Position détectée",
          description: "Votre position a été mise à jour",
        });
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast({
          title: "Erreur",
          description: "Impossible d'obtenir votre position",
          variant: "destructive",
        });
      }
    );
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName || null,
          username: username || null,
          show_on_map: showOnMap,
          location_lat: locationLat,
          location_lng: locationLng,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Profil sauvegardé",
        description: "Vos modifications ont été enregistrées",
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le profil",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-lg mx-auto space-y-6 pb-24">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold">Mon Profil</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gérez vos informations personnelles
          </p>
        </div>

        {/* Avatar Section */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <Label className="text-sm font-medium mb-4 block">Photo de profil</Label>
          
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24 border-2 border-primary/20">
              <AvatarImage src={avatarUrl || undefined} alt={fullName || "Avatar"} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                {fullName?.[0]?.toUpperCase() || <User className="h-10 w-10" />}
              </AvatarFallback>
            </Avatar>

            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={handleFileUpload}
                className="hidden"
              />
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Importer
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => cameraInputRef.current?.click()}
                disabled={uploading}
              >
                <Camera className="h-4 w-4 mr-2" />
                Photo
              </Button>
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <h2 className="font-semibold">Informations</h2>
          
          <div className="space-y-2">
            <Label htmlFor="fullName">Nom complet</Label>
            <Input
              id="fullName"
              placeholder="Votre nom"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Nom d'utilisateur</Label>
            <Input
              id="username"
              placeholder="@username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={user?.email || ""}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              L'email ne peut pas être modifié
            </p>
          </div>
        </div>

        {/* Location Preferences */}
        <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <h2 className="font-semibold">Localisation</h2>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="showOnMap">Apparaître sur la carte</Label>
              <p className="text-xs text-muted-foreground">
                Les autres utilisateurs pourront vous trouver
              </p>
            </div>
            <Switch
              id="showOnMap"
              checked={showOnMap}
              onCheckedChange={setShowOnMap}
            />
          </div>

          <div className="pt-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleGetLocation}
            >
              <MapPin className="h-4 w-4 mr-2" />
              {locationLat && locationLng
                ? "Mettre à jour ma position"
                : "Détecter ma position"}
            </Button>
            
            {locationLat && locationLng && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Position: {locationLat.toFixed(4)}, {locationLng.toFixed(4)}
              </p>
            )}
          </div>
        </div>

        {/* Save Button */}
        <Button
          variant="gameswap"
          className="w-full"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Sauvegarder
        </Button>
      </div>
    </MainLayout>
  );
};

export default Profile;
