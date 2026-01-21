import { Search, Plus, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/gameswap-logo.png";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  onSearch?: (query: string) => void;
}

export const Header = ({ onSearch }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container flex items-center justify-between h-16 gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={logo} alt="GameSwap" className="h-9 w-9 rounded-xl" />
          <span className="font-bold text-xl hidden sm:block">GameSwap</span>
        </Link>

        {/* Search Bar */}
        <div className="flex-1 max-w-xl mx-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher un jeu..."
              className="search-input pl-11"
              onChange={(e) => onSearch?.(e.target.value)}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <Button variant="gameswap" size="sm" className="hidden sm:flex">
            <Plus className="h-4 w-4 mr-1" />
            Post a Game
          </Button>
          <Button variant="gameswap" size="icon" className="sm:hidden">
            <Plus className="h-4 w-4" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 p-1 rounded-full hover:bg-muted transition-colors">
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                  <span className="text-sm font-semibold text-primary">U</span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link to="/profile">Mon profil</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings">Paramètres</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/legal">Mentions légales</Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                Se déconnecter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
