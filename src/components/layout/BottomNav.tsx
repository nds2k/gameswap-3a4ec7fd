import { memo } from "react";
import { Home, Search, User, MessageCircle, ScanLine } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const BottomNav = memo(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const navItems = [
    { path: "/", icon: Home, label: "Accueil", requiresAuth: false },
    { path: "/search", icon: Search, label: "Recherche", requiresAuth: false },
    { path: "/scanner", icon: ScanLine, label: "Scanner", requiresAuth: true, isCenter: true },
    { path: "/friends", icon: MessageCircle, label: "Messages", requiresAuth: true },
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
              className="flex flex-col items-center -mt-5"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-200 ${
                isActive 
                  ? "bg-primary text-primary-foreground scale-105" 
                  : "bg-primary/90 text-primary-foreground hover:bg-primary"
              }`}>
                <Icon className="h-6 w-6" />
              </div>
              <span className="text-[9px] font-semibold mt-1 text-primary">{item.label}</span>
            </Link>
          );
        }

        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={(e) => handleNavClick(e, item.path, item.requiresAuth)}
            className={`flex flex-col items-center gap-0.5 py-1.5 px-3 transition-colors duration-200 ${
              isActive ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className={`h-5 w-5 ${isActive ? "scale-105" : ""}`} />
            <span className="text-[9px] font-semibold">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
});

BottomNav.displayName = "BottomNav";
