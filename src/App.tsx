
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
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import DashboardMobile from "./pages/DashboardMobile";
import PlayerManagement from "./pages/PlayerManagement";
import PlayerManagementMobile from "./pages/PlayerManagementMobile";
import CalendarEvents from "./pages/CalendarEvents";
import CalendarEventsMobile from "./pages/CalendarEventsMobile";
import Analytics from "./pages/Analytics";
import AnalyticsMobile from "./pages/AnalyticsMobile";
import TeamManagement from "./pages/TeamManagement";
import TeamManagementMobile from "./pages/TeamManagementMobile";
import ClubManagement from "./pages/ClubManagement";
import ClubManagementMobile from "./pages/ClubManagementMobile";
import StaffManagement from "./pages/StaffManagement";
import StaffManagementMobile from "./pages/StaffManagementMobile";
import UserManagement from "./pages/UserManagement";
import UserManagementMobile from "./pages/UserManagementMobile";
import SubscriptionManagement from "./pages/SubscriptionManagement";
import SubscriptionManagementMobile from "./pages/SubscriptionManagementMobile";

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
              <Route path="/auth" element={<Auth />} />
              <Route path="/account-linking" element={<AccountLinking />} />
              <Route 
                path="/dashboard" 
                element={
                  <ResponsiveRoute
                    desktopComponent={<Dashboard />}
                    mobileComponent={<DashboardMobile />}
                  />
                }
              />
              <Route 
                path="/players" 
                element={
                  <ResponsiveRoute
                    desktopComponent={<PlayerManagement />}
                    mobileComponent={<PlayerManagementMobile />}
                  />
                }
              />
              <Route 
                path="/calendar" 
                element={
                  <ResponsiveRoute
                    desktopComponent={<CalendarEvents />}
                    mobileComponent={<CalendarEventsMobile />}
                  />
                }
              />
              <Route 
                path="/analytics" 
                element={
                  <ResponsiveRoute
                    desktopComponent={<Analytics />}
                    mobileComponent={<AnalyticsMobile />}
                  />
                }
              />
              <Route 
                path="/teams" 
                element={
                  <ResponsiveRoute
                    desktopComponent={<TeamManagement />}
                    mobileComponent={<TeamManagementMobile />}
                  />
                }
              />
              <Route 
                path="/clubs" 
                element={
                  <ResponsiveRoute
                    desktopComponent={<ClubManagement />}
                    mobileComponent={<ClubManagementMobile />}
                  />
                }
              />
              <Route 
                path="/staff" 
                element={
                  <ResponsiveRoute
                    desktopComponent={<StaffManagement />}
                    mobileComponent={<StaffManagementMobile />}
                  />
                }
              />
              <Route 
                path="/users" 
                element={
                  <ResponsiveRoute
                    desktopComponent={<UserManagement />}
                    mobileComponent={<UserManagementMobile />}
                  />
                }
              />
              <Route 
                path="/subscriptions" 
                element={
                  <ResponsiveRoute
                    desktopComponent={<SubscriptionManagement />}
                    mobileComponent={<SubscriptionManagementMobile />}
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
