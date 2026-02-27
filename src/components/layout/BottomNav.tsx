import { memo } from "react";
import { Compass, Heart, MessageSquare, User, Users } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

export const BottomNav = memo(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  const navItems = [
    { path: "/", icon: Compass, labelKey: "nav.discover", requiresAuth: false },
    { path: "/friends", icon: Users, labelKey: "nav.friends", requiresAuth: true },
    { path: "/wishlist", icon: Heart, labelKey: "nav.wishlist", requiresAuth: true },
    { path: "/forum", icon: MessageSquare, labelKey: "nav.forum", requiresAuth: true },
    { path: "/profile", icon: User, labelKey: "nav.profile", requiresAuth: true },
  ];

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
            <span className="text-xs font-semibold">{t(item.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
});

BottomNav.displayName = "BottomNav";
