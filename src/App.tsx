import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/providers/ThemeProvider";

// Eagerly loaded pages (critical path)
import Discover from "./pages/Discover";
import Auth from "./pages/Auth";

// Lazy loaded pages
const Wishlist = lazy(() => import("./pages/Wishlist"));
const Forum = lazy(() => import("./pages/Forum"));
const Settings = lazy(() => import("./pages/Settings"));
const MapPage = lazy(() => import("./pages/MapPage"));
const Profile = lazy(() => import("./pages/Profile"));
const Legal = lazy(() => import("./pages/Legal"));
const Privacy = lazy(() => import("./pages/Privacy"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const JoinGroup = lazy(() => import("./pages/JoinGroup"));
const Friends = lazy(() => import("./pages/Friends"));
const MyGames = lazy(() => import("./pages/MyGames"));
const Support = lazy(() => import("./pages/Support"));
const Chat = lazy(() => import("./pages/Chat"));
const PrivateChat = lazy(() => import("./pages/PrivateChat"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const AiChat = lazy(() => import("./pages/AiChat"));
const PrivateRoomChat = lazy(() => import("./pages/PrivateRoomChat"));
const PaymentRequests = lazy(() => import("./pages/PaymentRequests"));
const Community = lazy(() => import("./pages/Community"));
const ProfileAnalytics = lazy(() => import("./pages/ProfileAnalytics"));
const XPRewards = lazy(() => import("./pages/XPRewards"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Scanner = lazy(() => import("./pages/Scanner"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

// Auth route wrapper
const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

// Mobile back button handler
const MobileBackButtonHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handlePopState = () => {
      // The browser already handles popstate by default with BrowserRouter,
      // but we add a safety net: if we're at root, push a history entry
      // to prevent the app from closing on Android
      if (location.pathname === "/") {
        window.history.pushState(null, "", "/");
      }
    };

    // Push an initial state so first back press doesn't exit
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [location.pathname]);

  return null;
};

const AppRoutes = () => {
  return (
    <>
      <MobileBackButtonHandler />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
          <Route path="/" element={<Discover />} />
          <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
          <Route path="/forum" element={<ProtectedRoute><Forum /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/map" element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
          <Route path="/messages" element={<Navigate to="/friends" replace />} />
          <Route path="/chat/:conversationId" element={<ProtectedRoute><PrivateChat /></ProtectedRoute>} />
          <Route path="/group/:conversationId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/user/:userId" element={<UserProfile />} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/profile/analytics" element={<ProtectedRoute><ProfileAnalytics /></ProtectedRoute>} />
          <Route path="/profile/xp-rewards" element={<ProtectedRoute><XPRewards /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/join/:conversationId" element={<ProtectedRoute><JoinGroup /></ProtectedRoute>} />
          <Route path="/friends" element={<ProtectedRoute><Friends /></ProtectedRoute>} />
          <Route path="/my-games" element={<ProtectedRoute><MyGames /></ProtectedRoute>} />
          <Route path="/payment-requests" element={<ProtectedRoute><PaymentRequests /></ProtectedRoute>} />
          <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
          <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
          <Route path="/ai-chat" element={<ProtectedRoute><AiChat /></ProtectedRoute>} />
          <Route path="/private-chat" element={<ProtectedRoute><PrivateRoomChat /></ProtectedRoute>} />
          <Route path="/legal" element={<Legal />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/scanner" element={<ProtectedRoute><Scanner /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
