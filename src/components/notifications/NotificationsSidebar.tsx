import { Bell, MessageCircle, Heart, CreditCard, Info, Check, X } from "lucide-react";
import { useNotifications, type AppNotification } from "@/hooks/useNotifications";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface NotificationsSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getNotificationIcon = (type: AppNotification["type"]) => {
  switch (type) {
    case "message":
      return <MessageCircle className="h-5 w-5 text-blue-500" />;
    case "wishlist":
      return <Heart className="h-5 w-5 text-destructive" />;
    case "sale":
      return <CreditCard className="h-5 w-5 text-green-500" />;
    case "system":
    default:
      return <Info className="h-5 w-5 text-primary" />;
  }
};

const getNotificationRoute = (notification: AppNotification): string | null => {
  switch (notification.type) {
    case "message":
      return "/friends";
    case "wishlist":
      return "/wishlist";
    case "sale":
      return "/my-games";
    case "system":
    default:
      return null;
  }
};

export const NotificationsSidebar = ({ open, onOpenChange }: NotificationsSidebarProps) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, requestPermission, loading } = useNotifications();
  const navigate = useNavigate();

  const handleEnableNotifications = async () => {
    const granted = await requestPermission();
    if (granted) {
      // Show success message
    }
  };

  const handleNotificationClick = (notification: AppNotification) => {
    markAsRead(notification.id);
    const route = getNotificationRoute(notification);
    if (route) {
      onOpenChange(false);
      navigate(route);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <SheetTitle>Notifications</SheetTitle>
                {unreadCount > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
                <Check className="h-4 w-4 mr-1" />
                Tout lire
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Enable push notifications banner */}
          {"Notification" in window && Notification.permission === "default" && (
            <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Activer les notifications</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Recevez des alertes instantanées pour les nouveaux messages, même quand l'onglet est fermé
                  </p>
                  <Button size="sm" variant="gameswap" onClick={handleEnableNotifications} className="w-full sm:w-auto">
                    <Bell className="h-4 w-4 mr-2" />
                    Activer les notifications
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Push notifications blocked warning */}
          {"Notification" in window && Notification.permission === "denied" && (
            <div className="p-4 bg-destructive/10 border-b border-border">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                  <X className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-destructive">Notifications bloquées</p>
                  <p className="text-xs text-muted-foreground">
                    Les notifications sont bloquées. Pour les activer, cliquez sur l'icône 🔒 dans la barre d'adresse et autorisez les notifications.
                  </p>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Aucune notification</h3>
              <p className="text-muted-foreground text-sm">
                Vous êtes à jour ! Les nouvelles notifications apparaîtront ici.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full p-4 flex gap-3 text-left hover:bg-muted/50 transition-colors ${
                    !notification.read ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${!notification.read ? "font-semibold" : "font-medium"}`}>
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {notification.body}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};