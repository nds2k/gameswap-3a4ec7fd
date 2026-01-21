import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "fr" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  fr: {
    // Navigation
    "nav.discover": "Découvrir",
    "nav.friends": "Amis",
    "nav.wishlist": "Wishlist",
    "nav.forum": "Forum",
    "nav.profile": "Profil",
    
    // Friends & Messages page
    "friends.title": "Amis & Messages",
    "friends.add": "Ajouter",
    "friends.messages": "Messages",
    "friends.games": "Jeux",
    "friends.friends": "Amis",
    "friends.requests": "Demandes",
    "friends.startConversation": "Nouvelle conversation",
    "friends.selectFriend": "Sélectionnez un ami",
    "friends.noFriends": "Vous n'avez pas encore d'amis.",
    "friends.addFriendsHint": "Ajoutez des amis pour voir leurs jeux !",
    
    // Messages
    "messages.conversations": "conversations",
    "messages.conversation": "conversation",
    "messages.createGroup": "Groupe",
    "messages.noConversations": "Aucune conversation",
    "messages.contactSeller": "Contactez un vendeur ou créez un groupe",
    "messages.newConversation": "Nouvelle conversation",
    "messages.startConversation": "Commencez la conversation !",
    "messages.placeholder": "Écrivez un message...",
    "messages.suspended": "Vous êtes temporairement suspendu...",
    
    // Settings
    "settings.title": "Paramètres",
    "settings.manage": "Gérez votre compte",
    "settings.personalInfo": "Informations personnelles",
    "settings.fullName": "Nom complet",
    "settings.username": "Nom d'utilisateur",
    "settings.email": "Email",
    "settings.emailNote": "L'email ne peut pas être modifié",
    "settings.location": "Localisation",
    "settings.visibleOnMap": "Visible sur la carte",
    "settings.visibleOnMapDesc": "Les autres utilisateurs pourront vous trouver",
    "settings.detectLocation": "Détecter ma position",
    "settings.updateLocation": "Mettre à jour ma position",
    "settings.save": "Sauvegarder les modifications",
    "settings.saving": "Sauvegarde...",
    "settings.preferences": "Préférences",
    "settings.notifications": "Notifications",
    "settings.darkMode": "Mode sombre",
    "settings.language": "Langue",
    "settings.french": "Français",
    "settings.english": "English",
    "settings.info": "Informations",
    "settings.legal": "Mentions légales",
    "settings.help": "Aide et FAQ",
    "settings.signOut": "Se déconnecter",
    
    // Common
    "common.cancel": "Annuler",
    "common.confirm": "Confirmer",
    "common.loading": "Chargement...",
    "common.error": "Erreur",
    "common.success": "Succès",
  },
  en: {
    // Navigation
    "nav.discover": "Discover",
    "nav.friends": "Friends",
    "nav.wishlist": "Wishlist",
    "nav.forum": "Forum",
    "nav.profile": "Profile",
    
    // Friends & Messages page
    "friends.title": "Friends & Messages",
    "friends.add": "Add",
    "friends.messages": "Messages",
    "friends.games": "Games",
    "friends.friends": "Friends",
    "friends.requests": "Requests",
    "friends.startConversation": "New conversation",
    "friends.selectFriend": "Select a friend",
    "friends.noFriends": "You don't have any friends yet.",
    "friends.addFriendsHint": "Add friends to see their games!",
    
    // Messages
    "messages.conversations": "conversations",
    "messages.conversation": "conversation",
    "messages.createGroup": "Group",
    "messages.noConversations": "No conversations",
    "messages.contactSeller": "Contact a seller or create a group",
    "messages.newConversation": "New conversation",
    "messages.startConversation": "Start the conversation!",
    "messages.placeholder": "Write a message...",
    "messages.suspended": "You are temporarily suspended...",
    
    // Settings
    "settings.title": "Settings",
    "settings.manage": "Manage your account",
    "settings.personalInfo": "Personal information",
    "settings.fullName": "Full name",
    "settings.username": "Username",
    "settings.email": "Email",
    "settings.emailNote": "Email cannot be changed",
    "settings.location": "Location",
    "settings.visibleOnMap": "Visible on map",
    "settings.visibleOnMapDesc": "Other users will be able to find you",
    "settings.detectLocation": "Detect my location",
    "settings.updateLocation": "Update my location",
    "settings.save": "Save changes",
    "settings.saving": "Saving...",
    "settings.preferences": "Preferences",
    "settings.notifications": "Notifications",
    "settings.darkMode": "Dark mode",
    "settings.language": "Language",
    "settings.french": "Français",
    "settings.english": "English",
    "settings.info": "Information",
    "settings.legal": "Legal notice",
    "settings.help": "Help & FAQ",
    "settings.signOut": "Sign out",
    
    // Common
    "common.cancel": "Cancel",
    "common.confirm": "Confirm",
    "common.loading": "Loading...",
    "common.error": "Error",
    "common.success": "Success",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("gameswap-language");
    return (saved as Language) || "fr";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("gameswap-language", lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
