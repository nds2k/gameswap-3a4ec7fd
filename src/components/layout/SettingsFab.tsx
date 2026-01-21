import { Settings, Map, MessageCircle, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const SettingsFab = () => {
  return (
    <div className="fixed right-3 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2">
      {/* Map button */}
      <Link
        to="/map"
        className="w-11 h-11 rounded-full bg-card shadow-lg border border-border flex items-center justify-center transition-all duration-200 hover:shadow-xl hover:scale-105 active:scale-95"
      >
        <Map className="h-5 w-5 text-muted-foreground" />
      </Link>

      {/* Messages button */}
      <Link
        to="/messages"
        className="relative w-11 h-11 rounded-full bg-card shadow-lg border border-border flex items-center justify-center transition-all duration-200 hover:shadow-xl hover:scale-105 active:scale-95"
      >
        <MessageCircle className="h-5 w-5 text-muted-foreground" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
          2
        </span>
      </Link>

      {/* Notifications */}
      <button className="w-11 h-11 rounded-full bg-card shadow-lg border border-border flex items-center justify-center transition-all duration-200 hover:shadow-xl hover:scale-105 active:scale-95">
        <Bell className="h-5 w-5 text-muted-foreground" />
      </button>

      {/* Settings dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-11 h-11 rounded-full bg-card shadow-lg border border-border flex items-center justify-center transition-all duration-200 hover:shadow-xl hover:scale-105 active:scale-95">
            <Settings className="h-5 w-5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="left" className="w-48">
          <DropdownMenuItem asChild>
            <Link to="/settings">Paramètres</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/profile">Mon profil</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/legal">Mentions légales</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/support">Support</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
