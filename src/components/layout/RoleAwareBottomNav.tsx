import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Calendar, 
  Target,
  Baby
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  name: string;
  href: string;
  icon: any;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Individual', href: '/individual-training', icon: Target },
  { name: 'My Team', href: '/child-progress', icon: Baby },
];

export function RoleAwareBottomNav() {
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-[calc(theme(spacing.safe-bottom)+0.75rem)]">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
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