
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Player, Team, SubscriptionType, GameFormat } from '@/types';
import { supabase } from '@/integrations/supabase/client';

interface PlayerTransferFormProps {
  player: Player;
  currentTeamId: string;
  onSubmit: (data: { 
    toTeamId: string; 
    dataTransferOptions: {
      full: boolean;
      attributes: boolean;
      comments: boolean;
      objectives: boolean;
      events: boolean;
    }
  }) => void;
  onCancel: () => void;
}

export const PlayerTransferForm: React.FC<PlayerTransferFormProps> = ({
  player,
  currentTeamId,
  onSubmit,
  onCancel
}) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [dataTransferOptions, setDataTransferOptions] = useState({
    full: false,
    attributes: false,
    comments: false,
    objectives: false,
    events: false
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const { data, error } = await supabase
          .from('teams')
          .select('*')
          .neq('id', currentTeamId);

        if (error) {
          throw error;
        }

        setTeams(data.map(team => ({
          id: team.id,
          name: team.name,
          ageGroup: team.age_group,
          gameFormat: team.game_format as GameFormat,
          seasonStart: team.season_start,
          seasonEnd: team.season_end,
          subscriptionType: team.subscription_type as SubscriptionType,
          createdAt: team.created_at,
          updatedAt: team.updated_at,
          performanceCategories: team.performance_categories || [],
          kitIcons: (team.kit_icons as { home: string; away: string; training: string; goalkeeper: string }) || { home: '', away: '', training: '', goalkeeper: '' }
        })));
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching teams:', error);
        setIsLoading(false);
      }
    };

    fetchTeams();
  }, [currentTeamId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTeamId) {
      onSubmit({
        toTeamId: selectedTeamId,
        dataTransferOptions
      });
    }
  };

  const handleFullToggle = (checked: boolean) => {
    if (checked) {
      setDataTransferOptions({
        full: true,
        attributes: true,
        comments: true,
        objectives: true,
        events: true
      });
    } else {
      setDataTransferOptions({
        full: false,
        attributes: false,
        comments: false,
        objectives: false,
        events: false
      });
    }
  };

  const handleOptionToggle = (option: keyof typeof dataTransferOptions, checked: boolean) => {
    setDataTransferOptions(prev => {
      const newOptions = { ...prev, [option]: checked };
      // If all individual options are selected, set full to true
      if (
        newOptions.attributes &&
        newOptions.comments &&
        newOptions.objectives &&
        newOptions.events
      ) {
        newOptions.full = true;
      } else {
        newOptions.full = false;
      }
      return newOptions;
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <p className="text-muted-foreground">
        You are about to transfer {player.name} to another team. Select the destination team and what data should be transferred.
      </p>

      <div className="space-y-2">
        <Label htmlFor="toTeamId">Transfer To Team</Label>
        {isLoading ? (
          <div className="text-center py-2">Loading teams...</div>
        ) : teams.length === 0 ? (
          <div className="text-center py-2 text-muted-foreground">
            No other teams available for transfer.
          </div>
        ) : (
          <Select 
            value={selectedTeamId}
            onValueChange={setSelectedTeamId}
            required
          >
            <SelectTrigger id="toTeamId">
              <SelectValue placeholder="Select destination team" />
            </SelectTrigger>
            <SelectContent>
              {teams.map(team => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name} ({team.ageGroup})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-4 mt-4">
        <Label>Data Transfer Options</Label>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="fullTransfer"
            checked={dataTransferOptions.full}
            onCheckedChange={(checked) => handleFullToggle(!!checked)}
          />
          <Label htmlFor="fullTransfer" className="font-medium">Transfer all player data</Label>
        </div>
        
        <div className="pl-6 space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="attributesTransfer"
              checked={dataTransferOptions.attributes}
              onCheckedChange={(checked) => handleOptionToggle('attributes', !!checked)}
            />
            <Label htmlFor="attributesTransfer">Player attributes</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="objectivesTransfer"
              checked={dataTransferOptions.objectives}
              onCheckedChange={(checked) => handleOptionToggle('objectives', !!checked)}
            />
            <Label htmlFor="objectivesTransfer">Player objectives</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="commentsTransfer"
              checked={dataTransferOptions.comments}
              onCheckedChange={(checked) => handleOptionToggle('comments', !!checked)}
            />
            <Label htmlFor="commentsTransfer">Coach comments</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="eventsTransfer"
              checked={dataTransferOptions.events}
              onCheckedChange={(checked) => handleOptionToggle('events', !!checked)}
            />
            <Label htmlFor="eventsTransfer">Match stats & events</Label>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={!selectedTeamId || isLoading}
          className="bg-puma-blue-500 hover:bg-puma-blue-600"
        >
          Initiate Transfer
        </Button>
      </div>
    </form>
  );
};
