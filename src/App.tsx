
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthorizationProvider } from "@/contexts/AuthorizationContext";
import { ResponsiveRoute } from "@/components/routing/ResponsiveRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AccountLinking from "./pages/AccountLinking";
import { PlayerManagement } from "./components/players/PlayerManagement";
import PlayerManagementMobile from "./pages/PlayerManagementMobile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AuthorizationProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/account-linking" element={<AccountLinking />} />
              <Route 
                path="/players" 
                element={
                  <ResponsiveRoute
                    desktopComponent={<Index />}
                    mobileComponent={<PlayerManagementMobile />}
                  />
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthorizationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
