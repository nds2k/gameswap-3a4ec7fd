import { Settings as SettingsIcon, User, Bell, Shield, HelpCircle, LogOut, ChevronRight, Moon, Sun, Scale, Mail, MapPin } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "next-themes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [showOnMap, setShowOnMap] = useState(true);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const isDarkMode = theme === "dark";

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("show_on_map, full_name, username, location_lat, location_lng")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setShowOnMap(data.show_on_map ?? true);
            setFullName(data.full_name || "");
            setUsername(data.username || "");
            setLocationLat(data.location_lat);
            setLocationLng(data.location_lng);
          }
        });
    }
  }, [user]);

  const handleShowOnMapChange = async (value: boolean) => {
    setShowOnMap(value);
    if (user) {
      await supabase
        .from("profiles")
        .update({ show_on_map: value })
        .eq("user_id", user.id);
    }
  };

  const handleDarkModeChange = (value: boolean) => {
    setTheme(value ? "dark" : "light");
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

  const handleSaveProfile = async () => {
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
        description: "Impossible de sauvegarder les modifications",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const menuItems = [
    {
      section: "Préférences",
      items: [
        { icon: Bell, label: "Notifications", toggle: true, value: notifications, onChange: setNotifications },
        { icon: isDarkMode ? Moon : Sun, label: "Mode sombre", toggle: true, value: isDarkMode, onChange: handleDarkModeChange },
      ],
    },
    {
      section: "Informations",
      items: [
        { icon: Scale, label: "Mentions légales", href: "/legal" },
        { icon: HelpCircle, label: "Aide et FAQ", href: "/support" },
      ],
    },
  ];

  return (
    <MainLayout showSearch={false}>
      <div className="container py-6 max-w-2xl mx-auto pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
            <SettingsIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Paramètres</h1>
            <p className="text-muted-foreground">Gérez votre compte</p>
          </div>
        </div>

        {/* Profile Settings */}
        <div className="space-y-6 animate-fade-in">
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-2">
              Informations personnelles
            </h2>
            <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
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
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{user?.email || ""}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  L'email ne peut pas être modifié
                </p>
              </div>
            </div>
          </div>

          {/* Location Settings */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-2">
              Localisation
            </h2>
            <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
              <button
                onClick={() => handleShowOnMapChange(!showOnMap)}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div className="text-left">
                    <span className="font-medium block">Visible sur la carte</span>
                    <span className="text-xs text-muted-foreground">
                      Les autres utilisateurs pourront vous trouver
                    </span>
                  </div>
                </div>
                <div
                  className={`w-12 h-7 rounded-full transition-colors flex items-center p-1 ${
                    showOnMap ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                      showOnMap ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </div>
              </button>

              <div className="pt-2 border-t border-border">
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
          </div>

          {/* Save Button */}
          <Button
            variant="gameswap"
            className="w-full"
            onClick={handleSaveProfile}
            disabled={saving}
          >
            {saving ? "Sauvegarde..." : "Sauvegarder les modifications"}
          </Button>

          {/* Menu Sections */}
          {menuItems.map((section) => (
            <div key={section.section}>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-2">
                {section.section}
              </h2>
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                {section.items.map((item, index) => {
                  const Icon = item.icon;
                  
                  if (item.toggle) {
                    return (
                      <button
                        key={item.label}
                        onClick={() => item.onChange?.(!item.value)}
                        className={`w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors ${
                          index !== section.items.length - 1 ? "border-b border-border" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">{item.label}</span>
                        </div>
                        <div
                          className={`w-12 h-7 rounded-full transition-colors flex items-center p-1 ${
                            item.value ? "bg-primary" : "bg-muted"
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                              item.value ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </div>
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={item.label}
                      to={item.href || "#"}
                      className={`flex items-center justify-between p-4 hover:bg-muted/50 transition-colors ${
                        index !== section.items.length - 1 ? "border-b border-border" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{item.label}</span>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sign Out */}
        <div className="mt-8">
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-destructive/10 text-destructive font-semibold hover:bg-destructive/20 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Se déconnecter
          </button>
        </div>

        {/* Version */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          GameSwap v1.0.0
        </p>
      </div>
    </MainLayout>
  );
};

export default Settings;
