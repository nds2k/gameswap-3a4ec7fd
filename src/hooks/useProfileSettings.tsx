import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface ProfileSettings {
  fullName: string;
  username: string;
  showOnMap: boolean;
  allowFriendRequests: boolean;
  locationLat: number | null;
  locationLng: number | null;
}

export const useProfileSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ProfileSettings>({
    fullName: "",
    username: "",
    showOnMap: true,
    allowFriendRequests: true,
    locationLat: null,
    locationLng: null,
  });

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("full_name, username, show_on_map, allow_friend_requests, location_lat, location_lng")
          .eq("user_id", user.id)
          .single();

        if (error) throw error;

        if (data) {
          setSettings({
            fullName: data.full_name || "",
            username: data.username || "",
            showOnMap: data.show_on_map ?? true,
            allowFriendRequests: data.allow_friend_requests ?? true,
            locationLat: data.location_lat,
            locationLng: data.location_lng,
          });
        }
      } catch (error) {
        console.error("Error fetching profile settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [user]);

  const updateSetting = useCallback(async <K extends keyof ProfileSettings>(
    key: K,
    value: ProfileSettings[K]
  ) => {
    if (!user) return false;

    setSettings((prev) => ({ ...prev, [key]: value }));

    // Map frontend keys to database column names
    const columnMap: Record<keyof ProfileSettings, string> = {
      fullName: "full_name",
      username: "username",
      showOnMap: "show_on_map",
      allowFriendRequests: "allow_friend_requests",
      locationLat: "location_lat",
      locationLng: "location_lng",
    };

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ [columnMap[key]]: value })
        .eq("user_id", user.id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error updating setting:", error);
      // Revert on error
      setSettings((prev) => ({ ...prev, [key]: settings[key] }));
      return false;
    }
  }, [user, settings]);

  const saveAllSettings = useCallback(async () => {
    if (!user) return false;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: settings.fullName || null,
          username: settings.username || null,
          show_on_map: settings.showOnMap,
          allow_friend_requests: settings.allowFriendRequests,
          location_lat: settings.locationLat,
          location_lng: settings.locationLng,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Profil sauvegardé",
        description: "Vos modifications ont été enregistrées",
      });
      return true;
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les modifications",
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving(false);
    }
  }, [user, settings, toast]);

  return {
    settings,
    setSettings,
    loading,
    saving,
    updateSetting,
    saveAllSettings,
  };
};
