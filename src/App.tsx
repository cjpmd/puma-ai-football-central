
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./contexts/AuthContext";
import { AuthorizationProvider } from "./contexts/AuthorizationContext";
import { ResponsiveRoute } from "./components/routing/ResponsiveRoute";

// Import all pages
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import DashboardMobile from "./pages/DashboardMobile";
import Auth from "./pages/Auth";
import PlayerManagement from "./pages/PlayerManagement";
import PlayerManagementMobile from "./pages/PlayerManagementMobile";
import TeamManagement from "./pages/TeamManagement";
import StaffManagement from "./pages/StaffManagement";
import CalendarEvents from "./pages/CalendarEvents";
import CalendarEventsMobile from "./pages/CalendarEventsMobile";
import Analytics from "./pages/Analytics";
import AnalyticsMobile from "./pages/AnalyticsMobile";
import ClubManagement from "./pages/ClubManagement";
import UserManagement from "./pages/UserManagement";
import SubscriptionManagement from "./pages/SubscriptionManagement";
import EmailTestPage from "./pages/EmailTestPage";
import PlayerManagementTab from "./pages/PlayerManagementTab";
import DataRecovery from "./pages/DataRecovery";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AuthorizationProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route 
                  path="/dashboard" 
                  element={
                    <ResponsiveRoute 
                      desktopComponent={<Dashboard />} 
                      mobileComponent={<DashboardMobile />} 
                    />
                  } 
                />
                <Route path="/auth" element={<Auth />} />
                <Route 
                  path="/players" 
                  element={
                    <ResponsiveRoute 
                      desktopComponent={<PlayerManagement />} 
                      mobileComponent={<PlayerManagementMobile />} 
                    />
                  } 
                />
                <Route path="/player-management" element={<PlayerManagementTab />} />
                <Route path="/teams" element={<TeamManagement />} />
                <Route path="/staff" element={<StaffManagement />} />
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
                <Route path="/clubs" element={<ClubManagement />} />
                <Route path="/users" element={<UserManagement />} />
                <Route path="/subscriptions" element={<SubscriptionManagement />} />
                <Route path="/email-test" element={<EmailTestPage />} />
                <Route path="/data-recovery" element={<DataRecovery />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthorizationProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
