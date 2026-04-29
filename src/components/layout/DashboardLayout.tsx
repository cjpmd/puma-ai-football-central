
import { logger } from '@/lib/logger';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useSmartView } from '@/contexts/SmartViewContext';
import { HeaderEntitySwitcher } from './HeaderEntitySwitcher';
import { RoleContextSwitcher } from './RoleContextSwitcher';
import { useSmartNavigation } from '@/hooks/useSmartNavigation';
import { supabase } from '@/integrations/supabase/client';
import { 
  Menu,
  LogOut,
  Zap,
  BookOpen
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
  const location = useLocation();
  const navigate = useNavigate();
  const [academyId, setAcademyId] = useState<string | null>(null);
  
  // Handle case where contexts might not be available
  let currentView: string = 'parent';
  let isMultiRoleUser = false;
  let navigation: any[] = [];
  let quickActions: any[] = [];
  let isGlobalAdmin = false;
  
  try {
    const authorization = useAuthorization();
    isGlobalAdmin = authorization.isGlobalAdmin;
    
    const smartView = useSmartView();
    currentView = smartView.currentView;
    isMultiRoleUser = smartView.isMultiRoleUser;
    
    const smartNav = useSmartNavigation();
    navigation = smartNav.navigation;
    quickActions = smartNav.quickActions;
  } catch (error) {
    // Context not available, use fallback navigation
    logger.log('Context not available, using fallback navigation');
    navigation = [
      { name: 'Dashboard', href: '/dashboard', icon: Menu, priority: 1 },
      { name: 'Players', href: '/players', icon: Menu, priority: 2 },
      { name: 'Calendar', href: '/calendar', icon: Menu, priority: 3 }
    ];
  }

  // Academy nav: visible to global_admin, academy_admin, and head_of_academy roles
  const userRoles: string[] = (user as any)?.roles || [];
  const showAcademyLink =
    isGlobalAdmin ||
    userRoles.includes('academy_admin') ||
    userRoles.includes('head_of_academy');

  // Fetch the user's first academy ID for non-global-admin academy members
  useEffect(() => {
    if (!showAcademyLink || isGlobalAdmin) return;
    supabase
      .from('user_academies')
      .select('academy_id')
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]?.academy_id) setAcademyId(data[0].academy_id);
      });
  }, [showAcademyLink, isGlobalAdmin]);

  // global_admin goes to /clubs (academy management lives there);
  // academy members go to their specific academy dashboard
  const academyHref = isGlobalAdmin ? '/clubs' : (academyId ? `/academy/${academyId}` : null);

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
    <div className={cn('flex h-full w-64 flex-col bg-white/[0.04] backdrop-blur-xl', className)}>
      <div className="flex h-16 shrink-0 items-center border-b border-white/10 px-6">
        <div className="flex items-center gap-3">
          <img 
            src="/lovable-uploads/0e7b2d9e-64e2-46da-8a4f-01a3e2cd50df.png" 
            alt="Team Manager Logo" 
            className="w-8 h-8"
          />
          <h1 className="text-xl font-bold text-white">Team Manager</h1>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-1 p-4">
          {/* Quick Actions Section */}
          {quickActions.length > 0 && (
            <div className="mb-6">
              <div className="px-3 py-2 text-xs font-semibold text-white/50 uppercase tracking-wider">
                Quick Actions
              </div>
              <div className="flex flex-col gap-1">
                {quickActions.map((action) => (
                  <Link
                    key={action.name}
                    to={action.href}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-white/70 hover:bg-white/10 hover:text-white border border-dashed border-white/15"
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
          <div className="px-3 py-2 text-xs font-semibold text-white/50 uppercase tracking-wider">
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
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                <div className="flex-1">
                  {item.name}
                  {item.description && (
                    <div className="text-xs text-white/50 mt-0.5">
                      {item.description}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}

          {/* Academy nav item — visible to global_admin, academy_admin, head_of_academy */}
          {showAcademyLink && academyHref && (
            <Link
              to={academyHref}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors',
                location.pathname.startsWith('/academy')
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )}
              onClick={() => setSidebarOpen(false)}
            >
              <BookOpen className="h-5 w-5" />
              <div className="flex-1">Academy</div>
            </Link>
          )}
        </nav>
      </ScrollArea>
      <div className="border-t border-white/10 p-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-red-300 hover:text-red-200 hover:bg-red-500/15"
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5 mr-3" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar className="border-r border-white/10" />
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
        <div className="h-16 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl flex items-center px-6">
          <div className="flex-1 min-w-0">
            <HeaderEntitySwitcher variant="desktop" />
          </div>
          
          {/* Role Switcher */}
          <div className="flex items-center gap-3">
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
