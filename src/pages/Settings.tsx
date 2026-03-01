import { Settings as SettingsIcon, User, Bell, Shield, HelpCircle, LogOut, ChevronRight, Moon, Sun, Scale, Mail, MapPin, Globe, UserX, BellRing, CreditCard, Download, Trash2, Loader2, Store, CheckCircle } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { SellerOnboardingModal } from "@/components/seller/SellerOnboardingModal";

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountActionLoading, setAccountActionLoading] = useState(false);
  const [sellerModalOpen, setSellerModalOpen] = useState(false);
  const [sellerStatus, setSellerStatus] = useState<{ hasAccount: boolean; onboardingComplete: boolean } | null>(null);
  const [checkingSellerStatus, setCheckingSellerStatus] = useState(false);

  // Check seller status
  const checkSellerStatus = async () => {
    setCheckingSellerStatus(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-seller-status");
      if (!error && data) setSellerStatus(data);
    } catch {} finally {
      setCheckingSellerStatus(false);
    }
  };

  useEffect(() => {
    if (user) checkSellerStatus();
  }, [user]);

  // Handle Stripe redirect params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe") === "complete") {
      checkSellerStatus();
      toast({ title: "Vérification en cours", description: "Votre compte vendeur est en cours de validation." });
      window.history.replaceState({}, "", "/settings");
    }
  }, []);

  // Re-check notification permission every time Settings page is opened/focused
  useEffect(() => {
    setNotificationsEnabled(notificationPermission === "granted");
  }, [notificationPermission]);

  // Re-check permission on page visibility change (user comes back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && "Notification" in window) {
        setNotificationsEnabled(Notification.permission === "granted");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

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
      section: "Paiements",
      items: [
        { icon: CreditCard, label: "Paiements & Transactions", href: "/payment-requests" },
      ],
    },
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
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={async () => {
                    const newEmail = prompt("Entrez votre nouvel email :");
                    if (!newEmail || !newEmail.includes("@")) return;
                    const { error } = await supabase.auth.updateUser({ email: newEmail });
                    if (error) {
                      toast({ title: "Erreur", description: error.message, variant: "destructive" });
                    } else {
                      toast({ title: "Email de confirmation envoyé", description: "Vérifiez votre ancien et nouvel email pour confirmer le changement." });
                    }
                  }}
                >
                  <Mail className="h-3.5 w-3.5 mr-1.5" />
                  Changer d'email
                </Button>
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

          {/* Seller Account Section */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-2">
              Compte vendeur
            </h2>
            <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
              {checkingSellerStatus ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Vérification du statut...
                </div>
              ) : sellerStatus?.onboardingComplete ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Compte vendeur actif</p>
                    <p className="text-xs text-muted-foreground">Vous pouvez recevoir des paiements</p>
                  </div>
                </div>
              ) : sellerStatus?.hasAccount ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Votre inscription n'est pas terminée. Finalisez votre vérification.
                  </p>
                  <Button variant="outline" className="w-full" onClick={() => setSellerModalOpen(true)}>
                    <Store className="h-4 w-4 mr-2" />
                    Finaliser mon inscription
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Créez votre compte vendeur pour recevoir des paiements lors de vos ventes.
                  </p>
                  <Button variant="gameswap" className="w-full" onClick={() => setSellerModalOpen(true)}>
                    <Store className="h-4 w-4 mr-2" />
                    Devenir vendeur
                  </Button>
                </div>
              )}
            </div>
          </div>

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

        {/* Account Management */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-2">
            Compte
          </h2>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <button
              onClick={async () => {
                setAccountActionLoading(true);
                try {
                  const { data, error } = await supabase.functions.invoke("delete-account", {
                    body: { action: "export" },
                  });
                  if (error) throw error;
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `gameswap-data-${new Date().toISOString().split("T")[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast({ title: "Données exportées", description: "Votre fichier a été téléchargé." });
                } catch (e: any) {
                  toast({ title: "Erreur", description: e.message, variant: "destructive" });
                } finally {
                  setAccountActionLoading(false);
                }
              }}
              disabled={accountActionLoading}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors border-b border-border"
            >
              <div className="flex items-center gap-3">
                <Download className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <span className="font-medium block">Télécharger mes données</span>
                  <span className="text-xs text-muted-foreground">Export RGPD de toutes vos données</span>
                </div>
              </div>
              {accountActionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            </button>
            <button
              onClick={() => setDeleteDialogOpen(true)}
              className="w-full flex items-center gap-3 p-4 hover:bg-destructive/5 transition-colors text-destructive"
            >
              <Trash2 className="h-5 w-5" />
              <div className="text-left">
                <span className="font-medium block">Supprimer mon compte</span>
                <span className="text-xs opacity-70">Action irréversible</span>
              </div>
            </button>
          </div>
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

      {/* Delete Account Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer votre compte ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est définitive et irréversible. Toutes vos données, annonces, messages et évaluations seront supprimées. Nous vous recommandons de télécharger vos données avant de continuer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={accountActionLoading}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={accountActionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                setAccountActionLoading(true);
                try {
                  const { error } = await supabase.functions.invoke("delete-account", {
                    body: { action: "delete" },
                  });
                  if (error) throw error;
                  toast({ title: "Compte supprimé", description: "Votre compte a été définitivement supprimé." });
                  await signOut();
                  navigate("/auth");
                } catch (e: any) {
                  toast({ title: "Erreur", description: e.message, variant: "destructive" });
                } finally {
                  setAccountActionLoading(false);
                  setDeleteDialogOpen(false);
                }
              }}
            >
              {accountActionLoading ? "Suppression..." : "Supprimer définitivement"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SellerOnboardingModal
        open={sellerModalOpen}
        onOpenChange={setSellerModalOpen}
        onSuccess={checkSellerStatus}
      />
    </MainLayout>
  );
};

export default Settings;
