
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import TeamManagement from "./pages/TeamManagement";
import ClubManagement from "./pages/ClubManagement";
import StaffManagement from "./pages/StaffManagement";
import PlayerManagement from "./pages/PlayerManagement";
import CalendarEvents from "./pages/CalendarEvents";
import SubscriptionManagement from "./pages/SubscriptionManagement";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/teams" element={<ProtectedRoute><TeamManagement /></ProtectedRoute>} />
            <Route path="/clubs" element={<ProtectedRoute><ClubManagement /></ProtectedRoute>} />
            <Route path="/staff" element={<ProtectedRoute><StaffManagement /></ProtectedRoute>} />
            <Route path="/players" element={<ProtectedRoute><PlayerManagement /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><CalendarEvents /></ProtectedRoute>} />
            <Route path="/subscriptions" element={<ProtectedRoute><SubscriptionManagement /></ProtectedRoute>} />
            
            {/* Legacy routes that redirect to dashboard */}
            <Route path="/dashboard/squad" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/calendar" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/analytics" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/settings" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
