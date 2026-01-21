import { Compass, Heart, MessageSquare, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const navItems = [
  { path: "/", icon: Compass, label: "Découvrir" },
  { path: "/wishlist", icon: Heart, label: "Wishlist" },
  { path: "/forum", icon: MessageSquare, label: "Forum" },
  { path: "/profile", icon: User, label: "Profil" },
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
          </Link>
        );
      })}
    </nav>
  );
};
