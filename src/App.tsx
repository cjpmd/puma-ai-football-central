
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './components/theme-provider';
import { Toaster } from "./components/ui/toaster";
import { AuthProvider } from './contexts/AuthContext';
import Index from './pages/Index';
import Dashboard from './pages/Dashboard';
import Auth from './pages/Auth';
import TeamManagement from './pages/TeamManagement';
import PlayerManagement from './pages/PlayerManagement';
import ClubManagement from './pages/ClubManagement';
import CalendarEvents from './pages/CalendarEvents';
import StaffManagement from './pages/StaffManagement';
import UserManagement from './pages/UserManagement';
import SubscriptionManagement from './pages/SubscriptionManagement';
import NotFound from './pages/NotFound';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Toaster as SonnerToaster } from 'sonner';

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/teams" element={<ProtectedRoute><TeamManagement /></ProtectedRoute>} />
            <Route path="/players" element={<ProtectedRoute><PlayerManagement /></ProtectedRoute>} />
            <Route path="/clubs" element={<ProtectedRoute><ClubManagement /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><CalendarEvents /></ProtectedRoute>} />
            <Route path="/staff" element={<ProtectedRoute><StaffManagement /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
            <Route path="/subscriptions" element={<ProtectedRoute><SubscriptionManagement /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </Router>
      <Toaster />
      <SonnerToaster position="top-right" richColors />
    </ThemeProvider>
  );
}

export default App;
