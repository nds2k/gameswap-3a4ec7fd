import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/providers/ThemeProvider";
import Discover from "./pages/Discover";
import Wishlist from "./pages/Wishlist";
import Forum from "./pages/Forum";
import Settings from "./pages/Settings";
import MapPage from "./pages/MapPage";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import Legal from "./pages/Legal";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";
import JoinGroup from "./pages/JoinGroup";
import Friends from "./pages/Friends";
import MyGames from "./pages/MyGames";
import Support from "./pages/Support";
import Chat from "./pages/Chat";
import PrivateChat from "./pages/PrivateChat";
import UserProfile from "./pages/UserProfile";

const queryClient = new QueryClient();

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

// Auth route wrapper (redirects if already logged in)
const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
      {/* Discover is public - users can browse without login */}
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
      <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
      <Route path="/join/:conversationId" element={<ProtectedRoute><JoinGroup /></ProtectedRoute>} />
      <Route path="/friends" element={<ProtectedRoute><Friends /></ProtectedRoute>} />
      <Route path="/my-games" element={<ProtectedRoute><MyGames /></ProtectedRoute>} />
      <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
      <Route path="/legal" element={<Legal />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
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
