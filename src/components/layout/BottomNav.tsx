import { Compass, Heart, List, Gamepad2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const navItems = [
  { path: "/", icon: Compass, label: "Découvrir" },
  { path: "/wishlist", icon: Heart, label: "Wishlist" },
  { path: "/lists", icon: List, label: "Listes" },
  { path: "/my-games", icon: Gamepad2, label: "Jeux" },
];

export const BottomNav = () => {
  const location = useLocation();

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;

        return (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-tab ${isActive ? "active" : ""}`}
          >
            <Icon className={`nav-icon h-6 w-6 transition-transform duration-200 ${isActive ? "scale-110" : ""}`} />
            <span className="text-xs font-semibold">{item.label}</span>
            {item.path === "/wishlist" && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                3
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
};
