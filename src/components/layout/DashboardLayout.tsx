import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { EntityHeader } from '@/components/shared/EntityHeader';
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
  CreditCard
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Players', href: '/players', icon: Users },
  { name: 'Calendar & Events', href: '/calendar', icon: Calendar },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Player Management', href: '/player-management', icon: UserCheck },
  { name: 'Teams', href: '/teams', icon: Trophy },
  { name: 'Clubs', href: '/clubs', icon: Building2 },
  { name: 'Staff Management', href: '/staff', icon: UserCog },
  { name: 'User Management', href: '/users', icon: UserPlus },
  { name: 'Subscriptions', href: '/subscriptions', icon: CreditCard },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, signOut, teams, clubs } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Get current team or club for header display
  const currentTeam = teams?.[0]; // For now, show first team
  const currentClub = clubs?.[0]; // For now, show first club

  const Sidebar = ({ className }: { className?: string }) => (
    <div className={cn('flex h-full w-64 flex-col bg-background', className)}>
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
      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-1 p-4">
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
      </ScrollArea>
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
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar className="border-r" />
      </div>

      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden fixed top-4 left-4 z-40"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header with entity logo and name */}
        <div className="h-16 border-b bg-background flex items-center px-6">
          <div className="flex-1">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              {currentClub?.logo_url && (
                <img 
                  src={currentClub.logo_url} 
                  alt="Club logo" 
                  className="w-8 h-8 rounded-full object-cover"
                />
              )}
              {currentTeam?.logo_url && (
                <img 
                  src={currentTeam.logo_url} 
                  alt="Team logo" 
                  className="w-8 h-8 rounded-full object-cover"
                />
              )}
            </div>
            {currentClub ? (
              <EntityHeader 
                logoUrl={currentClub.logo_url}
                entityName={currentClub.name}
                entityType="club"
              />
            ) : currentTeam ? (
              <EntityHeader 
                logoUrl={currentTeam.logo_url}
                entityName={currentTeam.name}
                entityType="team"
              />
            ) : (
              <EntityHeader 
                entityName="Team Manager"
                entityType="team"
              />
            )}
          </div>
        </div>
        
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
