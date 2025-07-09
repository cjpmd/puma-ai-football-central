
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
import CalendarEvents from "./pages/CalendarEvents";
import CalendarEventsMobile from "./pages/CalendarEventsMobile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
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
                      desktopComponent={<Auth />} 
                      mobileComponent={<AuthMobile />} 
                    />
                  } 
                />

                {/* Protected routes */}
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
  );
}

export default App;
