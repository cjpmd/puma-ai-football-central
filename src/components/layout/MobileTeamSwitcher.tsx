import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Check, Users } from 'lucide-react';
import { useTeamContext } from '@/contexts/TeamContext';
import { Team } from '@/types';

interface MobileTeamSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileTeamSwitcher({ isOpen, onClose }: MobileTeamSwitcherProps) {
  const { currentTeam, setCurrentTeam, availableTeams, viewMode, setViewMode } = useTeamContext();

  const handleSelectTeam = (team: Team | null) => {
    if (team === null) {
      // "All Teams" selected
      setViewMode('all');
    } else {
      setCurrentTeam(team);
    }
    onClose();
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const isAllTeamsSelected = viewMode === 'all';

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-xl">Switch Team</SheetTitle>
        </SheetHeader>
        
        <div className="space-y-2 overflow-y-auto max-h-[calc(80vh-100px)] pb-safe-bottom">
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
      </SheetContent>
    </Sheet>
  );
}
