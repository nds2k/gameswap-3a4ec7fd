import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

export interface PermissionState {
  notification: PermissionState | "default" | "granted" | "denied";
  geolocation: "prompt" | "granted" | "denied" | "unsupported";
}

export const usePermissions = () => {
  const { toast } = useToast();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window)) {
      toast({
        title: "Non supporté",
        description: "Les notifications ne sont pas supportées par votre navigateur",
        variant: "destructive",
      });
      return false;
    }

    if (Notification.permission === "granted") {
      setNotificationPermission("granted");
      return true;
    }

    if (Notification.permission === "denied") {
      toast({
        title: "Notifications bloquées",
        description: "Veuillez autoriser les notifications dans les paramètres de votre navigateur",
        variant: "destructive",
      });
      setNotificationPermission("denied");
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === "granted") {
        toast({
          title: "Notifications activées",
          description: "Vous recevrez des notifications pour les nouveaux messages",
        });
        // Show a test notification
        new Notification("GameSwap", {
          body: "Les notifications sont maintenant activées !",
          icon: "/icon-192.png",
        });
        return true;
      } else {
        toast({
          title: "Notifications refusées",
          description: "Vous ne recevrez pas de notifications",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }, [toast]);

  const requestGeolocationPermission = useCallback((): Promise<GeolocationPosition | null> => {
    return new Promise((resolve) => {
      if (!("geolocation" in navigator)) {
        toast({
          title: "Non supporté",
          description: "La géolocalisation n'est pas supportée par votre navigateur",
          variant: "destructive",
        });
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          toast({
            title: "Position détectée",
            description: "Votre position a été obtenue avec succès",
          });
          resolve(position);
        },
        (error) => {
          let message = "Impossible d'obtenir votre position";
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = "Vous avez refusé l'accès à votre position";
              break;
            case error.POSITION_UNAVAILABLE:
              message = "Position non disponible";
              break;
            case error.TIMEOUT:
              message = "La demande de position a expiré";
              break;
          }
          
          toast({
            title: "Erreur de géolocalisation",
            description: message,
            variant: "destructive",
          });
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, [toast]);

  const checkNotificationPermission = useCallback((): NotificationPermission => {
    if (!("Notification" in window)) {
      return "denied";
    }
    return Notification.permission;
  }, []);

  const sendNotification = useCallback((title: string, options?: NotificationOptions): boolean => {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      return false;
    }

    try {
      new Notification(title, {
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        ...options,
      });
      return true;
    } catch (error) {
      console.error("Error sending notification:", error);
      return false;
    }
  }, []);

  return {
    notificationPermission,
    requestNotificationPermission,
    requestGeolocationPermission,
    checkNotificationPermission,
    sendNotification,
  };
};
