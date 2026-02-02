import { Settings as SettingsIcon, User, Bell, Shield, HelpCircle, LogOut, ChevronRight, Moon, Sun, Scale, Mail, MapPin, Globe, UserX, BellRing } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "next-themes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useProfileSettings } from "@/hooks/useProfileSettings";
import { usePermissions } from "@/hooks/usePermissions";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Settings = () => {
  const { user, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { 
    settings, 
    setSettings, 
    loading, 
    saving, 
    updateSetting, 
    saveAllSettings 
  } = useProfileSettings();
  const { 
    notificationPermission, 
    requestNotificationPermission,
    requestGeolocationPermission 
  } = usePermissions();

  const isDarkMode = theme === "dark";
  const [notificationsEnabled, setNotificationsEnabled] = useState(notificationPermission === "granted");

  useEffect(() => {
    setNotificationsEnabled(notificationPermission === "granted");
  }, [notificationPermission]);

  const handleDarkModeChange = (value: boolean) => {
    setTheme(value ? "dark" : "light");
  };

  const handleNotificationToggle = async () => {
    if (notificationPermission === "granted") {
      toast({
        title: "Info",
        description: "Pour désactiver les notifications, utilisez les paramètres de votre navigateur",
      });
      return;
    }
    
    const granted = await requestNotificationPermission();
    setNotificationsEnabled(granted);
  };

  const handleGetLocation = async () => {
    const position = await requestGeolocationPermission();
    if (position) {
      setSettings((prev) => ({
        ...prev,
        locationLat: position.coords.latitude,
        locationLng: position.coords.longitude,
      }));
    }
  };

  const handleAllowFriendRequestsChange = async (value: boolean) => {
    const success = await updateSetting("allowFriendRequests", value);
    if (success) {
      toast({
        title: value ? "Demandes d'amis activées" : "Demandes d'amis désactivées",
        description: value 
          ? "Les autres utilisateurs peuvent vous envoyer des demandes d'amis"
          : "Personne ne peut vous envoyer de demandes d'amis",
      });
    }
  };

  const handleShowOnMapChange = async (value: boolean) => {
    await updateSetting("showOnMap", value);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const menuItems = [
    {
      section: t("settings.info"),
      items: [
        { icon: Scale, label: t("settings.legal"), href: "/legal" },
        { icon: Shield, label: t("settings.privacy"), href: "/privacy" },
        { icon: HelpCircle, label: t("settings.help"), href: "/support" },
      ],
    },
  ];

  if (loading) {
    return (
      <MainLayout showSearch={false}>
        <div className="container py-6 max-w-2xl mx-auto flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </MainLayout>
    );
  }

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
                  value={settings.fullName}
                  onChange={(e) => setSettings((prev) => ({ ...prev, fullName: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Nom d'utilisateur</Label>
                <Input
                  id="username"
                  placeholder="@username"
                  value={settings.username}
                  onChange={(e) => setSettings((prev) => ({ ...prev, username: e.target.value }))}
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

          {/* Privacy Settings */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-2">
              Confidentialité
            </h2>
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              {/* Allow Friend Requests Toggle */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <UserX className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <span className="font-medium block">Accepter les demandes d'amis</span>
                    <span className="text-xs text-muted-foreground">
                      Permettre aux autres utilisateurs de vous ajouter
                    </span>
                  </div>
                </div>
                <Switch
                  checked={settings.allowFriendRequests}
                  onCheckedChange={handleAllowFriendRequestsChange}
                />
              </div>

              {/* Show on Map Toggle */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <span className="font-medium block">Visible sur la carte</span>
                    <span className="text-xs text-muted-foreground">
                      Les autres utilisateurs pourront vous trouver
                    </span>
                  </div>
                </div>
                <Switch
                  checked={settings.showOnMap}
                  onCheckedChange={handleShowOnMapChange}
                />
              </div>
            </div>
          </div>

          {/* Notifications Settings */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-2">
              Notifications
            </h2>
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <BellRing className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <span className="font-medium block">Notifications push</span>
                    <span className="text-xs text-muted-foreground">
                      {notificationPermission === "granted" 
                        ? "Les notifications sont activées"
                        : notificationPermission === "denied"
                        ? "Bloquées dans les paramètres du navigateur"
                        : "Recevez des alertes pour les nouveaux messages"
                      }
                    </span>
                  </div>
                </div>
                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={handleNotificationToggle}
                  disabled={notificationPermission === "denied"}
                />
              </div>
            </div>
          </div>

          {/* Location Settings */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-2">
              Localisation
            </h2>
            <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleGetLocation}
              >
                <MapPin className="h-4 w-4 mr-2" />
                {settings.locationLat && settings.locationLng
                  ? "Mettre à jour ma position"
                  : "Détecter ma position"}
              </Button>
              
              {settings.locationLat && settings.locationLng && (
                <p className="text-xs text-muted-foreground text-center">
                  Position: {settings.locationLat.toFixed(4)}, {settings.locationLng.toFixed(4)}
                </p>
              )}
            </div>
          </div>

          {/* Theme Toggle */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-2">
              Apparence
            </h2>
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  {isDarkMode ? <Moon className="h-5 w-5 text-muted-foreground" /> : <Sun className="h-5 w-5 text-muted-foreground" />}
                  <span className="font-medium">{t("settings.darkMode")}</span>
                </div>
                <Switch
                  checked={isDarkMode}
                  onCheckedChange={handleDarkModeChange}
                />
              </div>
            </div>
          </div>

          {/* Language Selector */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-2">
              {t("settings.language")}
            </h2>
            <div className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{t("settings.language")}</span>
                </div>
                <Select value={language} onValueChange={(value: "fr" | "en") => setLanguage(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">🇫🇷 Français</SelectItem>
                    <SelectItem value="en">🇬🇧 English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <Button
            variant="gameswap"
            className="w-full"
            onClick={saveAllSettings}
            disabled={saving}
          >
            {saving ? t("settings.saving") : t("settings.save")}
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
            {t("settings.signOut")}
          </button>
        </div>

        {/* Credits */}
        <div className="mt-8 text-center pt-6 border-t border-border">
          <p className="text-sm font-medium text-foreground">© 2026 GameSwap</p>
          <p className="text-xs text-muted-foreground mt-1">
            {language === 'fr' ? 'Tous droits réservés' : 'All rights reserved'}
          </p>
        </div>

        {/* Version */}
        <p className="text-center text-sm text-muted-foreground mt-4">
          GameSwap v1.0.0
        </p>
      </div>
    </MainLayout>
  );
};

export default Settings;
