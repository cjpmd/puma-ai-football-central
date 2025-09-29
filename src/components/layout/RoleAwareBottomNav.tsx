import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Users, 
  Calendar, 
  BarChart3,
  Trophy,
  Building2,
  UserCog,
  Menu,
  Dumbbell,
  Target,
  Baby
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  roles?: string[];
}

const allNavItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Players', href: '/players', icon: Users, roles: ['manager', 'coach', 'admin'] },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Training', href: '/training', icon: Dumbbell, roles: ['manager', 'coach', 'admin'] },
  { name: 'Individual', href: '/individual-training', icon: Target, roles: ['manager', 'coach', 'admin'] },
  { name: 'My Child', href: '/child-progress', icon: Baby, roles: ['parent'] },
];

export function RoleAwareBottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [isParent, setIsParent] = useState(false);

  useEffect(() => {
    if (user?.id) {
      checkUserRoles();
    }
  }, [user?.id]);

  const checkUserRoles = async () => {
    try {
      // Check if user is a parent (has linked children)
      const { data: userPlayers } = await supabase
        .from('user_players')
        .select('player_id')
        .eq('user_id', user!.id)
        .limit(1);

      const hasChildren = userPlayers && userPlayers.length > 0;
      setIsParent(hasChildren);

      // Get other roles from user_teams, user_clubs, etc.
      const { data: teamRoles } = await supabase
        .from('user_teams')
        .select('role')
        .eq('user_id', user!.id);

      const roles = new Set<string>();
      if (hasChildren) roles.add('parent');
      
      teamRoles?.forEach(team => {
        if (team.role?.includes('manager')) roles.add('manager');
        if (team.role?.includes('coach')) roles.add('coach');
        if (team.role?.includes('admin')) roles.add('admin');
      });

      setUserRoles(Array.from(roles));
    } catch (error) {
      console.error('Error checking user roles:', error);
    }
  };

  // Filter nav items based on user roles
  const getVisibleNavItems = () => {
    if (userRoles.length === 0) {
      // Default items if no roles determined yet
      return allNavItems.filter(item => !item.roles || item.roles.length === 0);
    }

    return allNavItems.filter(item => {
      if (!item.roles) return true; // Always show items without role restrictions
      return item.roles.some(role => userRoles.includes(role));
    }).slice(0, 5); // Max 5 items for mobile layout
  };

  const visibleNavItems = getVisibleNavItems();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-[calc(theme(spacing.safe-bottom)+0.75rem)]">
      <div className="flex justify-around items-center h-16 px-2">
        {visibleNavItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full text-xs transition-colors',
                isActive 
                  ? 'text-primary' 
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <item.icon className={cn('h-6 w-6 mb-1', isActive && 'text-primary')} />
              <span className={cn('font-medium', isActive && 'text-primary')}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}