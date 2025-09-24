
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { PushNotificationSetup } from '@/components/notifications/PushNotificationSetup';
import { EnhancedDashboardContent } from './EnhancedDashboardContent';
import { Sidebar } from '@/components/ui/sidebar';
import { 
  Home, 
  Users, 
  Calendar, 
  Settings, 
  Menu,
  LogOut,
  BarChart3,
  Trophy,
  UserCheck,
  Building2,
  UserCog,
  UserPlus,
  CreditCard,
  Dumbbell,
  Target
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface MultiRoleDashboardProps {
  onNavigate?: (route: string) => void;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Players', href: '/players', icon: Users },
  { name: 'Calendar & Events', href: '/calendar', icon: Calendar },
  { name: 'Training', href: '/training', icon: Dumbbell },
  { name: 'Individual Training', href: '/individual-training', icon: Target },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  
  { name: 'Teams', href: '/teams', icon: Trophy },
  { name: 'Clubs', href: '/clubs', icon: Building2 },
  { name: 'Staff Management', href: '/staff', icon: UserCog },
  { name: 'User Management', href: '/users', icon: UserPlus },
  { name: 'Subscriptions', href: '/subscriptions', icon: CreditCard },
];

export const MultiRoleDashboard: React.FC<MultiRoleDashboardProps> = ({ onNavigate }) => {
  const { user, teams, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMobileDetection();
  const [isTeamsLoaded, setIsTeamsLoaded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (teams) {
      setIsTeamsLoaded(true);
    }
  }, [teams]);

  const handleTeamNavigation = (teamId: string) => {
    if (onNavigate) {
      onNavigate(`/team/${teamId}`);
    } else {
      navigate(`/team/${teamId}`);
    }
  };

  const handleCreateTeam = () => {
    if (onNavigate) {
      onNavigate('/new-team');
    } else {
      navigate('/new-team');
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const isDashboardRoute = location.pathname === '/dashboard';

  if (isDashboardRoute) {
    return (
      <div className="flex h-screen bg-background">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <div className="flex h-full w-64 flex-col bg-background border-r">
            <div className="flex h-16 shrink-0 items-center border-b px-6">
              <div className="flex items-center gap-3">
                <img 
                  src="/lovable-uploads/0e7b2d9e-64e2-46da-8a4f-01a3e2cd50df.png" 
                  alt="Team Manager Logo" 
                  className="w-8 h-8"
                />
                <h1 className="text-xl font-bold text-foreground">Team Manager</h1>
              </div>
            </div>
            <div className="flex-1 overflow-auto py-4">
              <nav className="flex flex-col gap-1 px-4">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="border-t p-4">
              <Button
                variant="ghost"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleSignOut}
              >
                <LogOut className="h-5 w-5 mr-3" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile sidebar */}
        {isMobile && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-4 left-4 z-40 lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-6 w-6" />
            </Button>
            {sidebarOpen && (
              <div className="fixed inset-0 z-30 lg:hidden">
                <div className="fixed inset-0 bg-black/80" onClick={() => setSidebarOpen(false)} />
                <div className="fixed left-0 top-0 h-full w-64 bg-background border-r">
                  <div className="flex h-16 shrink-0 items-center border-b px-6">
                    <div className="flex items-center gap-3">
                      <img 
                        src="/lovable-uploads/0e7b2d9e-64e2-46da-8a4f-01a3e2cd50df.png" 
                        alt="Team Manager Logo" 
                        className="w-8 h-8"
                      />
                      <h1 className="text-xl font-bold text-foreground">Team Manager</h1>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto py-4">
                    <nav className="flex flex-col gap-1 px-4">
                      {navigation.map((item) => {
                        const isActive = location.pathname === item.href;
                        return (
                          <Link
                            key={item.name}
                            to={item.href}
                            className={cn(
                              'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors',
                              isActive
                                ? 'bg-accent text-accent-foreground'
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                            )}
                            onClick={() => setSidebarOpen(false)}
                          >
                            <item.icon className="h-5 w-5" />
                            {item.name}
                          </Link>
                        );
                      })}
                    </nav>
                  </div>
                  <div className="border-t p-4">
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={handleSignOut}
                    >
                      <LogOut className="h-5 w-5 mr-3" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto p-6 max-w-7xl">
              <EnhancedDashboardContent />
            </div>
          </main>
        </div>
      </div>
    );
  }

  // For non-dashboard routes, return the original simple dashboard
  return (
    <div className="space-y-6">
      {/* Push Notification Setup */}
      <PushNotificationSetup />

      {user && (
        <Card>
          <CardHeader>
            <CardTitle>Welcome, {user.email}!</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You are logged in.</p>
          </CardContent>
        </Card>
      )}

      {isTeamsLoaded && teams && teams.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Your Teams</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => (
              <Card key={team.id} className="cursor-pointer hover:opacity-75 transition-opacity" onClick={() => handleTeamNavigation(team.id)}>
                <CardHeader>
                  <CardTitle>{team.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>View team details and manage players.</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Teams Yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You are not assigned to any team.</p>
            <Button onClick={handleCreateTeam}>Create a New Team</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
