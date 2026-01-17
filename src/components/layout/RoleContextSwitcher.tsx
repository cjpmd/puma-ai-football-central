import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useSmartView } from '@/contexts/SmartViewContext';
import { 
  User, 
  Users, 
  Crown, 
  Building2, 
  Settings,
  ChevronDown 
} from 'lucide-react';

const roleIcons: Record<string, typeof User> = {
  parent: User,
  coach: Users,
  team_manager: Crown,
  club_admin: Building2,
  club_chair: Building2, // Leadership role - same icon as club_admin
  global_admin: Settings,
};

export function RoleContextSwitcher() {
  const { 
    currentView, 
    setCurrentView, 
    availableViews, 
    isMultiRoleUser,
    getViewLabel,
    primaryRole 
  } = useSmartView();

  if (!isMultiRoleUser) {
    // Single role user - show current role as badge without dropdown
    const CurrentIcon = roleIcons[currentView];
    return (
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="gap-1">
          <CurrentIcon className="h-3 w-3" />
          {getViewLabel(currentView)}
        </Badge>
      </div>
    );
  }

  const CurrentIcon = roleIcons[currentView];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 h-8">
          <CurrentIcon className="h-4 w-4" />
          <span className="text-sm">Viewing as: {getViewLabel(currentView)}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          Switch Context
        </div>
        <DropdownMenuSeparator />
        {availableViews.map((view) => {
          const Icon = roleIcons[view];
          const isActive = view === currentView;
          const isPrimary = view === primaryRole;
          
          return (
            <DropdownMenuItem
              key={view}
              onClick={() => setCurrentView(view)}
              className={`gap-2 ${isActive ? 'bg-accent' : ''}`}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{getViewLabel(view)}</span>
              {isPrimary && (
                <Badge variant="outline" className="text-xs">
                  Primary
                </Badge>
              )}
              {isActive && (
                <div className="w-2 h-2 bg-primary rounded-full" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}