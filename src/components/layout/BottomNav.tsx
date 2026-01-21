import { Compass, Heart, MessageSquare, User, Users } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { path: "/", icon: Compass, label: "Découvrir", requiresAuth: false },
  { path: "/friends", icon: Users, label: "Amis", requiresAuth: true },
  { path: "/wishlist", icon: Heart, label: "Wishlist", requiresAuth: true },
  { path: "/forum", icon: MessageSquare, label: "Forum", requiresAuth: true },
  { path: "/profile", icon: User, label: "Profil", requiresAuth: true },
];

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleNavClick = (e: React.MouseEvent, path: string, requiresAuth: boolean) => {
    if (requiresAuth && !user) {
      e.preventDefault();
      navigate("/auth");
    }
  };

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;

        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={(e) => handleNavClick(e, item.path, item.requiresAuth)}
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
