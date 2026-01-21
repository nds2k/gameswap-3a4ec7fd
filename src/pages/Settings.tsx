import { Settings as SettingsIcon, User, Bell, Shield, Palette, HelpCircle, LogOut, ChevronRight, Moon, Sun } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useState } from "react";
import { Link } from "react-router-dom";

const Settings = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);

  const menuItems = [
    {
      section: "Compte",
      items: [
        { icon: User, label: "Modifier le profil", href: "/profile" },
        { icon: Bell, label: "Notifications", toggle: true, value: notifications, onChange: setNotifications },
        { icon: Shield, label: "Confidentialité", href: "/privacy" },
      ],
    },
    {
      section: "Préférences",
      items: [
        { icon: isDarkMode ? Moon : Sun, label: "Mode sombre", toggle: true, value: isDarkMode, onChange: setIsDarkMode },
        { icon: Palette, label: "Apparence", href: "/appearance" },
      ],
    },
    {
      section: "Support",
      items: [
        { icon: HelpCircle, label: "Aide et FAQ", href: "/support" },
      ],
    },
  ];

  return (
    <MainLayout showSearch={false}>
      <div className="container py-6 max-w-2xl mx-auto">
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

        {/* Menu Sections */}
        <div className="space-y-6 animate-fade-in">
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
          <button className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-destructive/10 text-destructive font-semibold hover:bg-destructive/20 transition-colors">
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
