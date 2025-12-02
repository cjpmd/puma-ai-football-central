import { useState } from 'react';
import { Check, Building2, Users, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { useClubContext } from '@/contexts/ClubContext';
import { useTeamContext } from '@/contexts/TeamContext';
import { useSmartView } from '@/contexts/SmartViewContext';
import { Team } from '@/types';

interface HeaderEntitySwitcherProps {
  variant?: 'desktop' | 'mobile';
}

export function HeaderEntitySwitcher({ variant = 'desktop' }: HeaderEntitySwitcherProps) {
  const { teams: allUserTeams } = useAuth();
  const { currentClub, availableClubs, setCurrentClub } = useClubContext();
  const { currentTeam, availableTeams, setCurrentTeam, viewMode, setViewMode } = useTeamContext();
  const { currentView } = useSmartView();
  const [open, setOpen] = useState(false);

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  // Club-based roles show clubs, team-based roles show teams
  const isClubBasedRole = currentView === 'club_admin' || currentView === 'global_admin';
  const displayType = isClubBasedRole ? 'club' : 'team';
  
  // For team-based roles, show ALL teams across all clubs (not filtered by current club)
  // For club-based roles, show club-filtered teams
  const teamsToShow = isClubBasedRole ? availableTeams : allUserTeams;
  
  // Show switcher if role is club-based with multiple clubs, or team-based with multiple teams
  const showSwitcher = isClubBasedRole 
    ? availableClubs.length > 1
    : teamsToShow.length > 1;

  // Get display entity
  const displayEntity = displayType === 'club' ? currentClub : (viewMode === 'all' ? null : currentTeam);
  const displayName = displayType === 'club' 
    ? currentClub?.name || 'Select Club'
    : (viewMode === 'all' ? 'All Teams' : currentTeam?.name || 'Select Team');
  const displayLogo = displayType === 'club' ? currentClub?.logoUrl : currentTeam?.logoUrl;

  // Handle team selection in mobile
  const handleSelectTeam = (team: Team | null) => {
    if (team === null) {
      setViewMode('all');
    } else {
      setCurrentTeam(team);
    }
    setOpen(false);
  };

  // Desktop variant
  if (variant === 'desktop') {
    if (!showSwitcher) {
      // Static display for single club, single team
      return (
        <div className="flex items-center gap-3">
          {displayLogo ? (
            <img 
              src={displayLogo} 
              alt={displayName}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <span className="text-sm font-medium">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <h1 className="text-lg font-semibold">
              {displayName}
            </h1>
          </div>
        </div>
      );
    }

    // Clickable switcher for desktop
    if (displayType === 'club') {
      return (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              role="combobox"
              aria-expanded={open}
              className="h-auto px-3 py-2 hover:bg-accent"
            >
              <div className="flex items-center gap-3">
                {displayLogo ? (
                  <img 
                    src={displayLogo} 
                    alt={displayName}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Building2 className="h-4 w-4" />
                  </div>
                )}
                <div className="text-left">
                  <h1 className="text-lg font-semibold">{displayName}</h1>
                </div>
                <ChevronDown className="h-4 w-4 ml-1 opacity-50" />
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search clubs..." />
              <CommandList>
                <CommandEmpty>No clubs found.</CommandEmpty>
                <CommandGroup heading="Your Clubs">
                  {availableClubs.map((club) => (
                    <CommandItem
                      key={club.id}
                      onSelect={() => {
                        setCurrentClub(club);
                        setOpen(false);
                      }}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {club.logoUrl ? (
                          <img 
                            src={club.logoUrl} 
                            alt={club.name}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <Building2 className="h-4 w-4" />
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-medium">{club.name}</span>
                          {club.referenceNumber && (
                            <span className="text-xs text-muted-foreground">
                              {club.referenceNumber}
                            </span>
                          )}
                        </div>
                      </div>
                      <Check
                        className={cn(
                          'ml-auto h-4 w-4',
                          currentClub?.id === club.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      );
    } else {
      // Team switcher for desktop
      return (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              role="combobox"
              aria-expanded={open}
              className="h-auto px-3 py-2 hover:bg-accent"
            >
              <div className="flex items-center gap-3">
                {viewMode === 'all' ? (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                ) : displayLogo ? (
                  <img 
                    src={displayLogo} 
                    alt={displayName}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                    {getInitials(displayName)}
                  </div>
                )}
                <div className="text-left">
                  <h1 className="text-lg font-semibold">{displayName}</h1>
                </div>
                <ChevronDown className="h-4 w-4 ml-1 opacity-50" />
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search teams..." />
              <CommandList>
                <CommandEmpty>No teams found.</CommandEmpty>
                <CommandGroup heading="Your Teams">
                  {/* All Teams option */}
                  <CommandItem
                    onSelect={() => {
                      setViewMode('all');
                      setOpen(false);
                    }}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">All Teams</span>
                        <span className="text-xs text-muted-foreground">View integrated calendar</span>
                      </div>
                    </div>
                    <Check
                      className={cn(
                        'ml-auto h-4 w-4',
                        viewMode === 'all' ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                  </CommandItem>

                  {teamsToShow.map((team) => (
                    <CommandItem
                      key={team.id}
                      onSelect={() => {
                        setCurrentTeam(team);
                        setOpen(false);
                      }}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {team.logoUrl ? (
                          <img 
                            src={team.logoUrl} 
                            alt={team.name}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                            {getInitials(team.name)}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-medium">{team.name}</span>
                          {team.ageGroup && (
                            <span className="text-xs text-muted-foreground">{team.ageGroup}</span>
                          )}
                        </div>
                      </div>
                      <Check
                        className={cn(
                          'ml-auto h-4 w-4',
                          viewMode === 'single' && currentTeam?.id === team.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      );
    }
  }

  // Mobile variant
  if (!showSwitcher) {
    // Static display for single club, single team
    return (
      <div className="flex items-center gap-2">
        {displayLogo ? (
          <img 
            src={displayLogo} 
            alt={displayName}
            className="w-8 h-8 rounded-full object-cover ring-2 ring-white/30"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white ring-2 ring-white/30">
            {getInitials(displayName)}
          </div>
        )}
        <span className="text-sm font-semibold text-white truncate">{displayName}</span>
      </div>
    );
  }

  // Clickable switcher for mobile
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 transition-all hover:opacity-80 active:scale-95"
      >
        {displayType === 'club' ? (
          <>
            {displayLogo ? (
              <img 
                src={displayLogo} 
                alt={displayName}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-white/30"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center ring-2 ring-white/30">
                <Building2 className="h-4 w-4 text-white" />
              </div>
            )}
          </>
        ) : viewMode === 'all' ? (
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center ring-2 ring-white/30">
            <Users className="h-4 w-4 text-white" />
          </div>
        ) : displayLogo ? (
          <img 
            src={displayLogo} 
            alt={displayName}
            className="w-8 h-8 rounded-full object-cover ring-2 ring-white/30"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white ring-2 ring-white/30">
            {getInitials(displayName)}
          </div>
        )}
        <div className="flex flex-col items-start">
          <span className="text-sm font-semibold text-white truncate max-w-[150px]">{displayName}</span>
          <ChevronDown className="h-3 w-3 text-white/70" />
        </div>
      </button>

      {/* Mobile Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-xl">
              {displayType === 'club' ? 'Switch Club' : 'Switch Team'}
            </SheetTitle>
          </SheetHeader>
          
          <div className="space-y-2 overflow-y-auto max-h-[calc(80vh-100px)] pb-safe-bottom">
            {displayType === 'club' ? (
              // Club list
              availableClubs.map((club) => {
                const isSelected = currentClub?.id === club.id;
                return (
                  <button
                    key={club.id}
                    onClick={() => {
                      setCurrentClub(club);
                      setOpen(false);
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
                      <Check className="h-5 w-5 text-primary flex-shrink-0" />
                    )}
                  </button>
                );
              })
            ) : (
              // Team list
              <>
                {/* All Teams option */}
                <button
                  onClick={() => handleSelectTeam(null)}
                  className={`w-full flex items-center gap-3 p-4 rounded-lg transition-colors ${
                    viewMode === 'all'
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
                  {viewMode === 'all' && (
                    <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  )}
                </button>

                {/* Individual teams */}
                {teamsToShow.map((team) => {
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
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
