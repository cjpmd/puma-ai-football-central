
import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Team {
  id: string;
  name: string;
  ageGroup: string;
  gameFormat: string;
}

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
  const { teams: userTeams } = useAuth();
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  useEffect(() => {
    console.log('TeamSelector - userTeams:', userTeams);
    console.log('TeamSelector - selectedTeams:', selectedTeams);
    console.log('TeamSelector - primaryTeamId:', primaryTeamId);
    loadAvailableTeams();
  }, [userTeams, selectedTeams, primaryTeamId]);

  const loadAvailableTeams = () => {
    try {
      console.log('Loading available teams...');
      console.log('All user teams:', userTeams);
      console.log('Currently selected teams:', selectedTeams);
      
      // Load all teams that aren't already selected
      const filteredTeams = userTeams.filter(team => {
        const isNotSelected = !selectedTeams.includes(team.id);
        console.log(`Team ${team.name} (${team.id}): isNotSelected = ${isNotSelected}`);
        return isNotSelected;
      });
      
      console.log('Filtered available teams:', filteredTeams);
      setAvailableTeams(filteredTeams);
    } catch (error) {
      console.error('Error in loadAvailableTeams:', error);
    }
  };

  const handleAddTeam = () => {
    console.log('Adding team:', selectedTeamId);
    if (selectedTeamId && !selectedTeams.includes(selectedTeamId)) {
      // Only check maxTeams if it's provided
      if (maxTeams && selectedTeams.length >= maxTeams) {
        console.log('Maximum teams reached');
        return;
      }
      
      const newTeams = [...selectedTeams, selectedTeamId];
      console.log('New teams list:', newTeams);
      onTeamsChange(newTeams);
      setSelectedTeamId('');
    }
  };

  const handleRemoveTeam = (teamId: string) => {
    if (teamId !== primaryTeamId) { // Don't allow removing the primary team
      const newTeams = selectedTeams.filter(id => id !== teamId);
      console.log('Removing team, new list:', newTeams);
      onTeamsChange(newTeams);
    }
  };

  const getTeamName = (teamId: string) => {
    const team = userTeams.find(t => t.id === teamId);
    return team?.name || 'Unknown Team';
  };

  const canAddMoreTeams = !maxTeams || selectedTeams.length < maxTeams;
  const hasAvailableTeams = availableTeams.length > 0;

  console.log('Render state:', {
    canAddMoreTeams,
    hasAvailableTeams,
    availableTeamsCount: availableTeams.length,
    selectedTeamsCount: selectedTeams.length,
    maxTeams
  });

  return (
    <div className="space-y-3">
      <Label>Participating Teams</Label>
      
      {/* Selected Teams */}
      <div className="flex flex-wrap gap-2">
        {selectedTeams.map((teamId) => (
          <Badge key={teamId} variant="secondary" className="pr-1">
            {getTeamName(teamId)}
            {teamId === primaryTeamId && (
              <span className="ml-1 text-xs">(Primary)</span>
            )}
            {teamId !== primaryTeamId && (
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1 hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => handleRemoveTeam(teamId)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </Badge>
        ))}
      </div>

      {/* Add Team Selector - Show if we can add more teams */}
      {canAddMoreTeams && (
        <div className="space-y-2">
          {hasAvailableTeams ? (
            <div className="flex gap-2">
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Add another team..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTeams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name} ({team.ageGroup})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                onClick={handleAddTeam}
                disabled={!selectedTeamId}
                className="flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Team
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {selectedTeams.length === 1 ? 
                "No more teams available to add." : 
                "All available teams have been added."
              }
            </p>
          )}
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
        <div>Debug: Available teams: {availableTeams.length}, Can add more: {canAddMoreTeams.toString()}, Selected teams: {selectedTeams.length}</div>
        <div>User teams total: {userTeams.length}</div>
        <div>Available team names: {availableTeams.map(t => t.name).join(', ')}</div>
      </div>
    </div>
  );
};
