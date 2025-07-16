
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { EntityHeader } from '@/components/shared/EntityHeader';

const moreNavItems = [
  { name: 'Teams', href: '/teams' },
  { name: 'Clubs', href: '/clubs' },
  { name: 'Staff', href: '/staff' },
  { name: 'Users', href: '/users' },
  { name: 'Subscriptions', href: '/subscriptions' },
];

interface MobileHeaderProps {
  title?: string;
}

export function MobileHeader({ title }: MobileHeaderProps) {
  const { user, signOut, teams, clubs } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const currentTeam = teams?.[0];
  const currentClub = clubs?.[0];

  // Helper function to get team initials
  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="sticky top-0 z-40 bg-gradient-to-r from-blue-500 to-cyan-400 text-white pt-[calc(theme(spacing.safe-top)+0.75rem)]">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex-1 min-w-0">
          {title ? (
            <h1 className="text-sm font-semibold text-white truncate">{title}</h1>
          ) : teams && teams.length > 1 ? (
            <div className="flex items-center gap-2">
              {teams.slice(0, 3).map((team, index) => (
                <div key={team.id} className="flex items-center">
                  {team.logoUrl ? (
                    <img 
                      src={team.logoUrl} 
                      alt={team.name}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                      {getInitials(team.name)}
                    </div>
                  )}
                </div>
              ))}
              {teams.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                  +{teams.length - 3}
                </div>
              )}
            </div>
          ) : currentClub ? (
            <div className="flex items-center gap-2">
              {currentClub.logoUrl ? (
                <img 
                  src={currentClub.logoUrl} 
                  alt={currentClub.name}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                  {getInitials(currentClub.name)}
                </div>
              )}
              <span className="text-sm font-medium text-white truncate">{currentClub.name}</span>
            </div>
          ) : currentTeam ? (
            <div className="flex items-center gap-2">
              {currentTeam.logoUrl ? (
                <img 
                  src={currentTeam.logoUrl} 
                  alt={currentTeam.name}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                  {getInitials(currentTeam.name)}
                </div>
              )}
              <span className="text-sm font-medium text-white truncate">{currentTeam.name}</span>
            </div>
          ) : (
            <span className="text-sm font-medium text-white">Team Manager</span>
          )}
        </div>
        
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-white hover:bg-white/20">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64">
            <div className="flex flex-col h-full">
              <div className="flex-1 py-6">
                <nav className="space-y-2">
                  {moreNavItems.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className="block px-3 py-2 text-base font-medium text-gray-900 hover:bg-gray-50 rounded-lg"
                    >
                      {item.name}
                    </Link>
                  ))}
                </nav>
              </div>
              <div className="border-t pt-4">
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
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
