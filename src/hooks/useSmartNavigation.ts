import { useMemo } from 'react';
import { useSmartView } from '@/contexts/SmartViewContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthorization } from '@/contexts/AuthorizationContext';
import { 
  Home, 
  Users, 
  Calendar, 
  BarChart3,
  Trophy,
  Building2,
  UserCog,
  UserPlus,
  CreditCard,
  Dumbbell,
  Target,
  Heart,
  BookOpen
} from 'lucide-react';

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  priority: number;
  description?: string;
}

export const useSmartNavigation = () => {
  const { currentView } = useSmartView();
  const { connectedPlayers, teams, clubs } = useAuth();
  const { hasPermission } = useAuthorization();

  const navigation = useMemo((): NavigationItem[] => {
    const items: NavigationItem[] = [];

    // Always show dashboard
    items.push({
      name: 'Dashboard',
      href: '/dashboard',
      icon: Home,
      priority: 1,
      description: 'Overview and quick actions'
    });

    switch (currentView) {
      case 'parent':
        // Parent-focused navigation
        if (connectedPlayers.length > 0) {
          items.push({
            name: 'My Children',
            href: '/players',
            icon: Heart,
            priority: 2,
            description: 'View your children\'s progress'
          });
        }
        
        items.push({
          name: 'Events & Calendar',
          href: '/calendar',
          icon: Calendar,
          priority: 3,
          description: 'Upcoming games and training'
        });

        if (connectedPlayers.some(p => p.team)) {
          items.push({
            name: 'Team Updates',
            href: '/analytics',
            icon: BarChart3,
            priority: 4,
            description: 'Team performance and reports'
          });
        }
        break;

      case 'coach':
        // Coach-focused navigation
        items.push({
          name: 'My Players',
          href: '/players',
          icon: Users,
          priority: 2,
          description: 'Manage player development'
        });
        
        items.push({
          name: 'Training Plans',
          href: '/training',
          icon: Dumbbell,
          priority: 3,
          description: 'Create and manage training sessions'
        });

        items.push({
          name: 'Individual Training',
          href: '/individual-training',
          icon: Target,
          priority: 4,
          description: 'Personal development plans'
        });

        items.push({
          name: 'Match Calendar',
          href: '/calendar',
          icon: Calendar,
          priority: 5,
          description: 'Games and training schedule'
        });

        if (hasPermission({ resource: 'analytics', action: 'view' })) {
          items.push({
            name: 'Performance Analytics',
            href: '/analytics',
            icon: BarChart3,
            priority: 6,
            description: 'Player and team statistics'
          });
        }
        break;

      case 'team_manager':
        // Team Manager navigation - full team management
        items.push({
          name: 'Players',
          href: '/players',
          icon: Users,
          priority: 2,
          description: 'Manage team roster'
        });

        items.push({
          name: 'Calendar & Events',
          href: '/calendar',
          icon: Calendar,
          priority: 3,
          description: 'Schedule games and training'
        });

        items.push({
          name: 'Training',
          href: '/training',
          icon: Dumbbell,
          priority: 4,
          description: 'Team training sessions'
        });

        items.push({
          name: 'Individual Training',
          href: '/individual-training',
          icon: Target,
          priority: 5,
          description: 'Player development'
        });

        items.push({
          name: 'Analytics',
          href: '/analytics',
          icon: BarChart3,
          priority: 6,
          description: 'Team performance data'
        });

        items.push({
          name: 'Team Settings',
          href: '/teams',
          icon: Trophy,
          priority: 7,
          description: 'Manage team configuration'
        });

        if (hasPermission({ resource: 'staff', action: 'manage' })) {
          items.push({
            name: 'Staff Management',
            href: '/staff',
            icon: UserCog,
            priority: 8,
            description: 'Manage coaching staff'
          });
        }
        break;

      case 'club_admin':
        // Club Admin navigation - multi-team management
        items.push({
          name: 'Teams',
          href: '/teams',
          icon: Trophy,
          priority: 2,
          description: 'Manage all club teams'
        });

        items.push({
          name: 'Club Management',
          href: '/clubs',
          icon: Building2,
          priority: 3,
          description: 'Club settings and overview'
        });

        items.push({
          name: 'Players',
          href: '/players',
          icon: Users,
          priority: 4,
          description: 'View all club players'
        });

        items.push({
          name: 'Calendar & Events',
          href: '/calendar',
          icon: Calendar,
          priority: 5,
          description: 'Club-wide events'
        });

        items.push({
          name: 'Analytics',
          href: '/analytics',
          icon: BarChart3,
          priority: 6,
          description: 'Club performance data'
        });

        items.push({
          name: 'Staff Management',
          href: '/staff',
          icon: UserCog,
          priority: 7,
          description: 'Manage club staff'
        });

        if (hasPermission({ resource: 'users', action: 'manage' })) {
          items.push({
            name: 'User Management',
            href: '/users',
            icon: UserPlus,
            priority: 8,
            description: 'Manage club members'
          });
        }
        break;

      case 'global_admin':
        // Global Admin navigation - system-wide management
        items.push({
          name: 'Clubs',
          href: '/clubs',
          icon: Building2,
          priority: 2,
          description: 'Manage all clubs'
        });

        items.push({
          name: 'Teams',
          href: '/teams',
          icon: Trophy,
          priority: 3,
          description: 'Manage all teams'
        });

        items.push({
          name: 'User Management',
          href: '/users',
          icon: UserPlus,
          priority: 4,
          description: 'System user administration'
        });

        items.push({
          name: 'Staff Management',
          href: '/staff',
          icon: UserCog,
          priority: 5,
          description: 'Global staff management'
        });

        items.push({
          name: 'System Analytics',
          href: '/analytics',
          icon: BarChart3,
          priority: 6,
          description: 'Platform-wide analytics'
        });

        items.push({
          name: 'Players',
          href: '/players',
          icon: Users,
          priority: 7,
          description: 'View all players'
        });

        items.push({
          name: 'Calendar',
          href: '/calendar',
          icon: Calendar,
          priority: 8,
          description: 'System-wide events'
        });

        items.push({
          name: 'Subscriptions',
          href: '/subscriptions',
          icon: CreditCard,
          priority: 9,
          description: 'Manage subscriptions'
        });
        break;
    }

    // Sort by priority
    return items.sort((a, b) => a.priority - b.priority);
  }, [currentView, connectedPlayers, teams, clubs, hasPermission]);

  const quickActions = useMemo(() => {
    const actions: NavigationItem[] = [];

    switch (currentView) {
      case 'parent':
        if (connectedPlayers.length > 0) {
          actions.push({
            name: 'View Child Progress',
            href: `/players/${connectedPlayers[0].id}`,
            icon: Heart,
            priority: 1
          });
        }
        break;

      case 'coach':
      case 'team_manager':
        if (teams.length > 0) {
          actions.push({
            name: 'Create Training Session',
            href: '/training',
            icon: Dumbbell,
            priority: 1
          });
          actions.push({
            name: 'Schedule Event',
            href: '/calendar',
            icon: Calendar,
            priority: 2
          });
        }
        break;

      case 'club_admin':
        actions.push({
          name: 'Add Team',
          href: '/teams',
          icon: Trophy,
          priority: 1
        });
        if (clubs.length > 0) {
          actions.push({
            name: 'Club Settings',
            href: '/clubs',
            icon: Building2,
            priority: 2
          });
        }
        break;

      case 'global_admin':
        actions.push({
          name: 'System Overview',
          href: '/analytics',
          icon: BarChart3,
          priority: 1
        });
        break;
    }

    return actions;
  }, [currentView, connectedPlayers, teams, clubs]);

  return {
    navigation,
    quickActions,
    currentView
  };
};