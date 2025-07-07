
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

export function MobileHeader() {
  const { user, signOut, teams, clubs } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const currentTeam = teams?.[0];
  const currentClub = clubs?.[0];

  return (
    <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex-1">
          {currentClub ? (
            <EntityHeader 
              logoUrl={currentClub.logoUrl}
              entityName={currentClub.name}
              entityType="club"
            />
          ) : currentTeam ? (
            <EntityHeader 
              logoUrl={currentTeam.logoUrl}
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
        
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
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
