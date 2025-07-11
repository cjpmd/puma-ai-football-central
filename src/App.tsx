
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthorizationProvider } from "@/contexts/AuthorizationContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
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
              <Route path="/" element={<Navigate to="/auth" replace />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/login" element={<Navigate to="/auth" replace />} />
              <Route path="/account-linking" element={<AccountLinking />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <ResponsiveRoute
                      desktopComponent={<Dashboard />}
                      mobileComponent={<DashboardMobile />}
                    />
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/players" 
                element={
                  <ProtectedRoute>
                    <ResponsiveRoute
                      desktopComponent={<PlayerManagement />}
                      mobileComponent={<PlayerManagementMobile />}
                    />
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/calendar" 
                element={
                  <ProtectedRoute>
                    <ResponsiveRoute
                      desktopComponent={<CalendarEvents />}
                      mobileComponent={<CalendarEventsMobile />}
                    />
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/analytics" 
                element={
                  <ProtectedRoute>
                    <ResponsiveRoute
                      desktopComponent={<Analytics />}
                      mobileComponent={<AnalyticsMobile />}
                    />
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/teams" 
                element={
                  <ProtectedRoute>
                    <ResponsiveRoute
                      desktopComponent={<TeamManagement />}
                      mobileComponent={<TeamManagementMobile />}
                    />
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/clubs" 
                element={
                  <ProtectedRoute>
                    <ResponsiveRoute
                      desktopComponent={<ClubManagement />}
                      mobileComponent={<ClubManagementMobile />}
                    />
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/staff" 
                element={
                  <ProtectedRoute>
                    <ResponsiveRoute
                      desktopComponent={<StaffManagement />}
                      mobileComponent={<StaffManagementMobile />}
                    />
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/users" 
                element={
                  <ProtectedRoute>
                    <ResponsiveRoute
                      desktopComponent={<UserManagement />}
                      mobileComponent={<UserManagementMobile />}
                    />
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/subscriptions" 
                element={
                  <ProtectedRoute>
                    <ResponsiveRoute
                      desktopComponent={<SubscriptionManagement />}
                      mobileComponent={<SubscriptionManagementMobile />}
                    />
                  </ProtectedRoute>
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
