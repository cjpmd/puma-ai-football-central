
import { logger } from '@/lib/logger';
import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';

interface TeamSelectorProps {
  selectedTeams: string[];
  onTeamsChange: (teams: string[]) => void;
  primaryTeamId: string;
  maxTeams?: number;
}

export const TeamSelector: React.FC<TeamSelectorProps> = ({
  selectedTeams,
  onTeamsChange,
  primaryTeamId,
  maxTeams
}) => {
  logger.log('TeamSelector - selectedTeams:', selectedTeams);
  logger.log('TeamSelector - primaryTeamId:', primaryTeamId);

  const handleAddTeam = () => {
    logger.log('Adding new team');
    // Only check maxTeams if it's provided
    if (maxTeams && selectedTeams.length >= maxTeams) {
      logger.log('Maximum teams reached');
      return;
    }
    
    // Add a new team slot (using the primary team ID as the base, but it will be managed separately)
    const newTeams = [...selectedTeams, `${primaryTeamId}-team-${selectedTeams.length + 1}`];
    logger.log('New teams list:', newTeams);
    onTeamsChange(newTeams);
  };

  const handleRemoveTeam = (index: number) => {
    // Don't allow removing the first team (primary team)
    if (index === 0) {
      logger.log('Cannot remove primary team');
      return;
    }
    
    const newTeams = selectedTeams.filter((_, i) => i !== index);
    logger.log('Removing team at index', index, 'new list:', newTeams);
    onTeamsChange(newTeams);
  };

  const getTeamDisplayName = (teamId: string, index: number) => {
    return `Team ${index + 1}`;
  };

  const canAddMoreTeams = !maxTeams || selectedTeams.length < maxTeams;

  logger.log('Render state:', {
    canAddMoreTeams,
    selectedTeamsCount: selectedTeams.length,
    maxTeams
  });

  return (
    <div className="space-y-3">
      <Label>Participating Teams</Label>
      
      {/* Selected Teams */}
      <div className="flex flex-wrap gap-2">
        {selectedTeams.map((teamId, index) => (
          <Badge key={`${teamId}-${index}`} variant="secondary" className="pr-1">
            {getTeamDisplayName(teamId, index)}
            {index === 0 && (
              <span className="ml-1 text-xs">(Primary)</span>
            )}
            {index > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1 hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => handleRemoveTeam(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </Badge>
        ))}
      </div>

      {/* Add Team Button - Show if we can add more teams */}
      {canAddMoreTeams && (
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleAddTeam}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Add Team {selectedTeams.length + 1}
          </Button>
        </div>
      )}

      {/* Max teams reached message */}
      {maxTeams && selectedTeams.length >= maxTeams && (
        <p className="text-sm text-muted-foreground">
          Maximum of {maxTeams} teams can participate in this event.
        </p>
      )}
    </div>
  );
};
