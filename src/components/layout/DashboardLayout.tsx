
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useSmartView } from '@/contexts/SmartViewContext';
import { EntityHeader } from '@/components/shared/EntityHeader';
import { RoleContextSwitcher } from './RoleContextSwitcher';
import { useSmartNavigation } from '@/hooks/useSmartNavigation';
import { 
  Menu,
  LogOut,
  Zap
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { RoleDebugPanel } from '@/components/debug/RoleDebugPanel';
import { useAuthorization } from '@/contexts/AuthorizationContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// Navigation is now handled by useSmartNavigation hook

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, signOut, teams, clubs, connectedPlayers } = useAuth();
  const { isGlobalAdmin } = useAuthorization();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Handle case where SmartView context might not be available
  let currentView: string = 'parent';
  let isMultiRoleUser = false;
  let navigation: any[] = [];
  let quickActions: any[] = [];
  
  try {
    const smartView = useSmartView();
    currentView = smartView.currentView;
    isMultiRoleUser = smartView.isMultiRoleUser;
    
    const smartNav = useSmartNavigation();
    navigation = smartNav.navigation;
    quickActions = smartNav.quickActions;
  } catch (error) {
    // SmartView context not available, use fallback navigation
    console.log('SmartView context not available, using fallback navigation');
    navigation = [
      { name: 'Dashboard', href: '/dashboard', icon: Menu, priority: 1 },
      { name: 'Players', href: '/players', icon: Menu, priority: 2 },
      { name: 'Calendar', href: '/calendar', icon: Menu, priority: 3 }
    ];
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Get context-appropriate entity for header display
  const getHeaderEntity = () => {
    switch (currentView) {
      case 'parent':
        if (connectedPlayers.length > 0) {
          return {
            type: 'team' as const,
            name: connectedPlayers[0].team.name,
            logoUrl: connectedPlayers[0].team.logoUrl
          };
        }
        break;
      case 'coach':
      case 'team_manager':
        if (teams.length > 0) {
          return {
            type: 'team' as const,
            name: teams[0].name,
            logoUrl: teams[0].logoUrl
          };
        }
        break;
      case 'club_admin':
        if (clubs.length > 0) {
          return {
            type: 'club' as const,
            name: clubs[0].name,
            logoUrl: clubs[0].logoUrl
          };
        }
        break;
      case 'global_admin':
        return {
          type: 'team' as const,
          name: 'System Administration',
          logoUrl: null
        };
    }
    return null;
  };

  const headerEntity = getHeaderEntity();

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
          {/* Quick Actions Section */}
          {quickActions.length > 0 && (
            <div className="mb-6">
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Quick Actions
              </div>
              <div className="flex flex-col gap-1">
                {quickActions.map((action) => (
                  <Link
                    key={action.name}
                    to={action.href}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground border border-dashed border-muted-foreground/20"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Zap className="h-4 w-4" />
                    {action.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Main Navigation */}
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Navigation
          </div>
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
                <div className="flex-1">
                  {item.name}
                  {item.description && (
                    <div className="text-xs text-muted-foreground/70 mt-0.5">
                      {item.description}
                    </div>
                  )}
                </div>
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
        {/* Top header with entity logo, name, and role switcher */}
        <div className="h-16 border-b bg-background flex items-center px-6">
          <div className="flex-1">
            {headerEntity ? (
              <EntityHeader 
                logoUrl={headerEntity.logoUrl}
                entityName={headerEntity.name}
                entityType={headerEntity.type}
              />
            ) : (
              <EntityHeader 
                entityName="Team Manager"
                entityType="team"
              />
            )}
          </div>
          
          {/* Role Context Switcher */}
          <div className="flex items-center gap-4">
            {isMultiRoleUser && (
              <Badge variant="outline" className="text-xs">
                Multi-Role User
              </Badge>
            )}
            {/* Only show role switcher if SmartView context is available */}
            {typeof useSmartView !== 'undefined' && (
              <RoleContextSwitcher />
            )}
          </div>
        </div>
        
        <main className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-auto p-6">
            {children}
          </div>
        </main>
      </div>
      
      {/* Debug Panel for admins */}
      {isGlobalAdmin && <RoleDebugPanel />}
    </div>
  );
}
