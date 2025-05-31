
import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

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
  maxTeams?: number; // Made optional and will be ignored if not provided
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
    loadAvailableTeams();
  }, [selectedTeams, primaryTeamId]);

  const loadAvailableTeams = async () => {
    try {
      // Get the primary team to match game format
      const primaryTeam = userTeams.find(t => t.id === primaryTeamId);
      if (!primaryTeam) return;

      // Load teams with the same game format that aren't already selected
      const filteredTeams = userTeams.filter(team => 
        team.gameFormat === primaryTeam.gameFormat && 
        !selectedTeams.includes(team.id)
      );
      
      setAvailableTeams(filteredTeams);
    } catch (error) {
      console.error('Error in loadAvailableTeams:', error);
    }
  };

  const handleAddTeam = () => {
    if (selectedTeamId && !selectedTeams.includes(selectedTeamId)) {
      // Only check maxTeams if it's provided
      if (maxTeams && selectedTeams.length >= maxTeams) {
        return;
      }
      
      onTeamsChange([...selectedTeams, selectedTeamId]);
      setSelectedTeamId('');
    }
  };

  const handleRemoveTeam = (teamId: string) => {
    if (teamId !== primaryTeamId) { // Don't allow removing the primary team
      onTeamsChange(selectedTeams.filter(id => id !== teamId));
    }
  };

  const getTeamName = (teamId: string) => {
    const team = userTeams.find(t => t.id === teamId);
    return team?.name || 'Unknown Team';
  };

  const canAddMoreTeams = !maxTeams || selectedTeams.length < maxTeams;

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

      {/* Add Team Selector */}
      {canAddMoreTeams && availableTeams.length > 0 && (
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
      )}

      {/* Show team count info only if maxTeams is provided */}
      {maxTeams && selectedTeams.length >= maxTeams && (
        <p className="text-sm text-muted-foreground">
          Maximum of {maxTeams} teams can participate in this event.
        </p>
      )}

      {/* Show message if no teams available to add */}
      {canAddMoreTeams && availableTeams.length === 0 && selectedTeams.length > 1 && (
        <p className="text-sm text-muted-foreground">
          No more teams with the same game format available to add.
        </p>
      )}
    </div>
  );
};
