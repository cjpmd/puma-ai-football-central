
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
  console.log('TeamSelector - selectedTeams:', selectedTeams);
  console.log('TeamSelector - primaryTeamId:', primaryTeamId);

  const handleAddTeam = () => {
    console.log('Adding new team');
    // Only check maxTeams if it's provided
    if (maxTeams && selectedTeams.length >= maxTeams) {
      console.log('Maximum teams reached');
      return;
    }
    
    // Add the primary team ID again to create multiple teams for the event
    const newTeams = [...selectedTeams, primaryTeamId];
    console.log('New teams list:', newTeams);
    onTeamsChange(newTeams);
  };

  const handleRemoveTeam = (index: number) => {
    // Don't allow removing the first team (primary team)
    if (index === 0) {
      console.log('Cannot remove primary team');
      return;
    }
    
    const newTeams = selectedTeams.filter((_, i) => i !== index);
    console.log('Removing team at index', index, 'new list:', newTeams);
    onTeamsChange(newTeams);
  };

  const getTeamDisplayName = (teamId: string, index: number) => {
    return `Team ${index + 1}`;
  };

  const canAddMoreTeams = !maxTeams || selectedTeams.length < maxTeams;

  console.log('Render state:', {
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

      {/* Debug info - remove this after testing */}
      <div className="text-xs text-gray-400 space-y-1">
        <div>Debug: Can add more: {canAddMoreTeams.toString()}, Selected teams: {selectedTeams.length}</div>
        <div>Teams: {selectedTeams.map((_, i) => `Team ${i + 1}`).join(', ')}</div>
      </div>
    </div>
  );
};
