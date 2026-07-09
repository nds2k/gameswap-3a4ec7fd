import { memo } from "react";
import { Compass, Users, ScanLine, Heart, User } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const BottomNav = memo(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const navItems = [
    { path: "/", icon: Compass, label: "Découvrir", requiresAuth: false },
    { path: "/friends", icon: Users, label: "Amis", requiresAuth: true },
    { path: "/scanner", icon: ScanLine, label: "Scanner", requiresAuth: true, isCenter: true },
    { path: "/wishlists", icon: Heart, label: "wishlists", requiresAuth: true },
    { path: "/profile", icon: User, label: "Profil", requiresAuth: true },
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

        if (item.isCenter) {
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={(e) => handleNavClick(e, item.path, item.requiresAuth)}
              className="flex flex-col items-center -mt-4"
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md transition-all duration-200 ${
                isActive
                  ? "bg-primary text-primary-foreground scale-105"
                  : "bg-primary/90 text-primary-foreground hover:bg-primary"
              }`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-[9px] font-semibold mt-0.5 text-primary">{item.label}</span>
            </Link>
          );
        }

        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={(e) => handleNavClick(e, item.path, item.requiresAuth)}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 transition-colors duration-200 ${
              isActive ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className={`h-[18px] w-[18px] ${isActive ? "scale-105" : ""}`} />
            <span className="text-[9px] font-semibold">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
});

BottomNav.displayName = "BottomNav";
