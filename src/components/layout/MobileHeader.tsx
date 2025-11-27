import { useAuth } from '@/contexts/AuthContext';
import { useTeamContext } from '@/contexts/TeamContext';
import { useClubContext } from '@/contexts/ClubContext';
import { MobileTeamSwitcher } from './MobileTeamSwitcher';
import { ChevronDown, Users, Building2 } from 'lucide-react';
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface MobileHeaderProps {
  title?: string;
}

export function MobileHeader({ title }: MobileHeaderProps) {
  const { teams } = useAuth();
  const { currentTeam, availableTeams, isMultiTeamUser, viewMode } = useTeamContext();
  const { currentClub, availableClubs, setCurrentClub } = useClubContext();
  const [showTeamSwitcher, setShowTeamSwitcher] = useState(false);
  const [showClubSwitcher, setShowClubSwitcher] = useState(false);

  const isMultiClubUser = availableClubs.length > 1;

  // Helper function to get team initials
  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  // Helper function to render header content
  const renderHeaderContent = () => {
    // Override: If title is provided, show it
    if (title) {
      return <h1 className="text-sm font-semibold text-white truncate">{title}</h1>;
    }

    return (
      <div className="flex items-center gap-3">
        {/* Club Display/Switcher (if multi-club) */}
        {isMultiClubUser && currentClub && (
          <button
            onClick={() => setShowClubSwitcher(true)}
            className="flex items-center gap-2 transition-all hover:opacity-80 active:scale-95"
          >
            {currentClub.logoUrl ? (
              <img 
                src={currentClub.logoUrl} 
                alt={currentClub.name}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-2 ring-white/30"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 ring-2 ring-white/30">
                <Building2 className="h-4 w-4 text-white" />
              </div>
            )}
            <div className="flex flex-col items-start">
              <span className="text-xs font-medium text-white/90 truncate max-w-[120px]">
                {currentClub.name}
              </span>
              <ChevronDown className="h-3 w-3 text-white/70" />
            </div>
          </button>
        )}

        {/* Team Display/Switcher */}
        {isMultiTeamUser && availableTeams.length > 0 ? (
          <button
            onClick={() => setShowTeamSwitcher(true)}
            className="flex items-center gap-2 transition-all hover:opacity-80 active:scale-95"
          >
            {viewMode === 'all' ? (
              <>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 ring-2 ring-white/30">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-semibold text-white">All Teams</span>
                  <ChevronDown className="h-3 w-3 text-white/70" />
                </div>
              </>
            ) : currentTeam ? (
              <>
                {currentTeam.logoUrl ? (
                  <img 
                    src={currentTeam.logoUrl} 
                    alt={currentTeam.name}
                    className="w-8 h-8 rounded-full flex-shrink-0 object-cover ring-2 ring-white/30"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold flex-shrink-0 text-white ring-2 ring-white/30">
                    {getInitials(currentTeam.name)}
                  </div>
                )}
                <div className="flex flex-col items-start">
                  <span className="text-sm font-semibold text-white truncate max-w-[120px]">{currentTeam.name}</span>
                  <ChevronDown className="h-3 w-3 text-white/70" />
                </div>
              </>
            ) : null}
          </button>
        ) : (
          // Single team display (not clickable)
          (() => {
            const teamToDisplay = currentTeam || teams?.[0];
            if (teamToDisplay) {
              return (
                <div className="flex items-center gap-2">
                  {teamToDisplay.logoUrl ? (
                    <img 
                      src={teamToDisplay.logoUrl} 
                      alt={teamToDisplay.name}
                      className="w-8 h-8 rounded-full flex-shrink-0 object-cover ring-2 ring-white/30"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold flex-shrink-0 text-white ring-2 ring-white/30">
                      {getInitials(teamToDisplay.name)}
                    </div>
                  )}
                  <span className="text-sm font-semibold text-white truncate">{teamToDisplay.name}</span>
                </div>
              );
            }
            return <span className="text-sm font-medium text-white">Team Manager</span>;
          })()
        )}
      </div>
    );
  };

  return (
    <>
      <div className="sticky top-0 z-40 bg-gradient-to-r from-blue-500 to-cyan-400 text-white pt-[calc(theme(spacing.safe-top)+0.75rem)]">
        <div className="flex items-center justify-center h-14 px-4">
          {renderHeaderContent()}
        </div>
      </div>
      
      <MobileTeamSwitcher 
        isOpen={showTeamSwitcher}
        onClose={() => setShowTeamSwitcher(false)}
      />

      {/* Club Switcher Sheet */}
      <Sheet open={showClubSwitcher} onOpenChange={setShowClubSwitcher}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-xl">Switch Club</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-2 overflow-y-auto max-h-[calc(80vh-100px)] pb-safe-bottom">
            {availableClubs.map((club) => {
              const isSelected = currentClub?.id === club.id;
              
              return (
                <button
                  key={club.id}
                  onClick={() => {
                    setCurrentClub(club);
                    setShowClubSwitcher(false);
                  }}
                  className={`w-full flex items-center gap-3 p-4 rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-primary/10 border-2 border-primary'
                      : 'bg-muted/50 hover:bg-muted'
                  }`}
                >
                  {club.logoUrl ? (
                    <img 
                      src={club.logoUrl} 
                      alt={club.name}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 text-left">
                    <div className="font-semibold">{club.name}</div>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
