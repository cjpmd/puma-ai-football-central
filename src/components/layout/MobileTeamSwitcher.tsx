import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Check, Users, LogOut } from 'lucide-react';
import { useTeamContext } from '@/contexts/TeamContext';
import { useAuth } from '@/contexts/AuthContext';
import { Team } from '@/types';

interface MobileTeamSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileTeamSwitcher({ isOpen, onClose }: MobileTeamSwitcherProps) {
  const { currentTeam, setCurrentTeam, availableTeams, viewMode, setViewMode } = useTeamContext();
  const { signOut } = useAuth();

  const handleSelectTeam = (team: Team | null) => {
    if (team === null) {
      // "All Teams" selected
      setViewMode('all');
    } else {
      setCurrentTeam(team);
    }
    onClose();
  };

  const handleLogout = async () => {
    await signOut();
    onClose();
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const isAllTeamsSelected = viewMode === 'all';

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl flex flex-col">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-xl">Switch Team</SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 space-y-2 overflow-y-auto pb-4">
          {/* All Teams Option */}
          <button
            onClick={() => handleSelectTeam(null)}
            className={`w-full flex items-center gap-3 p-4 rounded-lg transition-colors ${
              isAllTeamsSelected
                ? 'bg-primary/10 border-2 border-primary'
                : 'bg-muted/50 hover:bg-muted'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-semibold">All Teams</div>
              <div className="text-sm text-muted-foreground">View integrated calendar</div>
            </div>
            {isAllTeamsSelected && (
              <Check className="h-5 w-5 text-primary flex-shrink-0" />
            )}
          </button>

          {/* Individual Teams */}
          {availableTeams.map((team) => {
            const isSelected = viewMode === 'single' && currentTeam?.id === team.id;
            
            return (
              <button
                key={team.id}
                onClick={() => handleSelectTeam(team)}
                className={`w-full flex items-center gap-3 p-4 rounded-lg transition-colors ${
                  isSelected
                    ? 'bg-primary/10 border-2 border-primary'
                    : 'bg-muted/50 hover:bg-muted'
                }`}
              >
                {team.logoUrl ? (
                  <img 
                    src={team.logoUrl} 
                    alt={team.name}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {getInitials(team.name)}
                  </div>
                )}
                <div className="flex-1 text-left">
                  <div className="font-semibold">{team.name}</div>
                  {team.ageGroup && (
                    <div className="text-sm text-muted-foreground">{team.ageGroup}</div>
                  )}
                </div>
                {isSelected && (
                  <Check className="h-5 w-5 text-primary flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Logout Button */}
        <div className="pt-2 pb-safe-bottom">
          <Separator className="mb-4" />
          <Button 
            variant="ghost" 
            className="w-full flex items-center justify-center gap-2 text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
