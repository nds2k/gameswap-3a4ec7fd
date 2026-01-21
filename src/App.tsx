import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Discover from "./pages/Discover";
import Wishlist from "./pages/Wishlist";
import Lists from "./pages/Lists";
import MyGames from "./pages/MyGames";
import Settings from "./pages/Settings";
import MapPage from "./pages/MapPage";
import Messages from "./pages/Messages";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Discover />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/lists" element={<Lists />} />
          <Route path="/my-games" element={<MyGames />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/messages" element={<Messages />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
