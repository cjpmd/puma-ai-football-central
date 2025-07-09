import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthorizationProvider } from "@/contexts/AuthorizationContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ResponsiveRoute } from "@/components/routing/ResponsiveRoute";

// Import all pages
import Index from "./pages/Index";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import AuthMobile from "./pages/AuthMobile";
import Dashboard from "./pages/Dashboard";
import DashboardMobile from "./pages/DashboardMobile";
import Clubs from "./pages/Clubs";
import ClubDetails from "./pages/ClubDetails";
import Teams from "./pages/Teams";
import TeamDetails from "./pages/TeamDetails";
import Players from "./pages/Players";
import PlayerDetails from "./pages/PlayerDetails";
import Facilities from "./pages/Facilities";
import FacilityDetails from "./pages/FacilityDetails";
import CalendarEvents from "./pages/CalendarEvents";
import CalendarEventsMobile from "./pages/CalendarEventsMobile";
import AccountSettings from "./pages/AccountSettings";
import AuthorizationSettings from "./pages/AuthorizationSettings";
import NotificationsSettings from "./pages/NotificationsSettings";
import IntegrationsSettings from "./pages/IntegrationsSettings";
import BillingSettings from "./pages/BillingSettings";
import SupportSettings from "./pages/SupportSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClient>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <AuthorizationProvider>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Home />} />
                  <Route path="/landing" element={<Index />} />
                  
                  {/* Auth routes */}
                  <Route 
                    path="/auth" 
                    element={
                      <ResponsiveRoute 
                        desktopComponent={Auth} 
                        mobileComponent={AuthMobile} 
                      />
                    } 
                  />

                  {/* Protected routes */}
                  <Route 
                    path="/dashboard" 
                    element={
                      <ProtectedRoute>
                        <ResponsiveRoute 
                          desktopComponent={Dashboard} 
                          mobileComponent={DashboardMobile} 
                        />
                      </ProtectedRoute>
                    } 
                  />

                  <Route
                    path="/clubs"
                    element={
                      <ProtectedRoute>
                        <Clubs />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/clubs/:clubId"
                    element={
                      <ProtectedRoute>
                        <ClubDetails />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/teams"
                    element={
                      <ProtectedRoute>
                        <Teams />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/teams/:teamId"
                    element={
                      <ProtectedRoute>
                        <TeamDetails />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/players"
                    element={
                      <ProtectedRoute>
                        <Players />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/players/:playerId"
                    element={
                      <ProtectedRoute>
                        <PlayerDetails />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/facilities"
                    element={
                      <ProtectedRoute>
                        <Facilities />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/facilities/:facilityId"
                    element={
                      <ProtectedRoute>
                        <FacilityDetails />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/calendar"
                    element={
                      <ProtectedRoute>
                        <ResponsiveRoute
                          desktopComponent={CalendarEvents}
                          mobileComponent={CalendarEventsMobile}
                        />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/account-settings"
                    element={
                      <ProtectedRoute>
                        <AccountSettings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/authorization-settings"
                    element={
                      <ProtectedRoute>
                        <AuthorizationSettings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/notifications-settings"
                    element={
                      <ProtectedRoute>
                        <NotificationsSettings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/integrations-settings"
                    element={
                      <ProtectedRoute>
                        <IntegrationsSettings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/billing-settings"
                    element={
                      <ProtectedRoute>
                        <BillingSettings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/support-settings"
                    element={
                      <ProtectedRoute>
                        <SupportSettings />
                      </ProtectedRoute>
                    }
                  />

                  {/* Not found route */}
                  <Route path="/404" element={<NotFound />} />

                  {/* Catch all route */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AuthorizationProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </QueryClient>
  );
}

export default App;
