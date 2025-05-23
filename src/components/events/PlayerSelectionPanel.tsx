
import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormationSelector } from './FormationSelector';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getFormationsByFormat, getPositionsForFormation } from '@/utils/formationUtils';
import { GameFormat, Position } from '@/types';
import { Button } from '@/components/ui/button';

interface PlayerSelectionPanelProps {
  eventId: string;
  teamId: string;
  gameFormat: string;
  periodNumber: number;
  teamNumber: number;
  performanceCategoryId: string | null;
  onSave?: () => void;
}

interface Player {
  id: string;
  name: string;
  squadNumber: number;
  position?: string;
  isSelectedInOtherTeam?: boolean;
  selectedTeamNumber?: number;
}

type PositionPlayerMap = Record<string, string>;

export const PlayerSelectionPanel: React.FC<PlayerSelectionPanelProps> = ({
  eventId,
  teamId,
  gameFormat,
  periodNumber,
  teamNumber = 1,
  performanceCategoryId,
  onSave
}) => {
  const gameFormatTyped = gameFormat as GameFormat;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedFormation, setSelectedFormation] = useState('');
  const [positions, setPositions] = useState<Position[]>([]);
  const [playerPositions, setPlayerPositions] = useState<PositionPlayerMap>({});
  const [substitutes, setSubstitutes] = useState<string[]>([]);
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [existingRecordId, setExistingRecordId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    console.log('PlayerSelectionPanel mounted with:', { eventId, teamId, periodNumber, teamNumber });
    loadPlayers();
    loadTeamSelection();
  }, [eventId, teamId, periodNumber, teamNumber, performanceCategoryId]);

  useEffect(() => {
    if (selectedFormation) {
      console.log('Formation changed to:', selectedFormation);
      const formationPositions = getPositionsForFormation(selectedFormation, gameFormatTyped);
      setPositions(formationPositions);
    }
  }, [selectedFormation, gameFormatTyped]);

  const loadPlayers = async () => {
    try {
      console.log('Loading players for team:', teamId);
      
      const { data, error } = await supabase
        .from('players')
        .select('id, name, squad_number')
        .eq('team_id', teamId)
        .eq('status', 'active')
        .order('squad_number');

      if (error) {
        console.error('Error loading players:', error);
        throw error;
      }

      console.log('Loaded players:', data);

      // Check which players are selected in other teams for this event/period
      const { data: existingSelections, error: selectionsError } = await supabase
        .from('event_selections')
        .select('player_positions, substitutes, team_number')
        .eq('event_id', eventId)
        .eq('period_number', periodNumber)
        .neq('team_number', teamNumber); // Exclude current team number

      if (selectionsError) {
        console.error('Error loading existing selections:', selectionsError);
      }

      const playerTeamMap = new Map<string, number>();
      
      if (existingSelections) {
        existingSelections.forEach(selection => {
          // Parse player positions
          if (selection.player_positions) {
            const positions = Array.isArray(selection.player_positions) 
              ? selection.player_positions 
              : JSON.parse(String(selection.player_positions || '[]'));
            
            positions.forEach((pos: any) => {
              if (pos && pos.playerId) {
                playerTeamMap.set(pos.playerId, selection.team_number);
              }
            });
          }
          
          // Parse substitutes
          if (selection.substitutes) {
            const subs = Array.isArray(selection.substitutes)
              ? selection.substitutes
              : JSON.parse(String(selection.substitutes || '[]'));
            
            subs.forEach((sub: any) => {
              if (typeof sub === 'string') {
                playerTeamMap.set(sub, selection.team_number);
              }
            });
          }
        });
      }

      const playersWithAvailability: Player[] = data?.map(p => ({
        id: p.id,
        name: p.name,
        squadNumber: p.squad_number,
        isSelectedInOtherTeam: playerTeamMap.has(p.id),
        selectedTeamNumber: playerTeamMap.get(p.id)
      })) || [];

      console.log('Players with availability:', playersWithAvailability);
      setPlayers(playersWithAvailability);
    } catch (error) {
      console.error('Error loading players:', error);
      toast({
        title: 'Error',
        description: 'Failed to load players',
        variant: 'destructive',
      });
    }
  };

  const loadTeamSelection = async () => {
    try {
      console.log('Loading team selection for:', { eventId, teamId, teamNumber, periodNumber });
      
      const { data, error } = await supabase
        .from('event_selections')
        .select('*')
        .eq('event_id', eventId)
        .eq('team_id', teamId)
        .eq('team_number', teamNumber)
        .eq('period_number', periodNumber)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading team selection:', error);
        throw error;
      }

      console.log('Loaded team selection:', data);

      if (data) {
        setExistingRecordId(data.id);
        setSelectedFormation(data.formation || '');
        setCaptainId(data.captain_id);
        
        const positions: PositionPlayerMap = {};
        const subs: string[] = [];
        
        if (data.player_positions) {
          const parsedPositions = Array.isArray(data.player_positions) 
            ? data.player_positions 
            : JSON.parse(String(data.player_positions || '[]'));
            
          parsedPositions.forEach((pp: any) => {
            if (pp && typeof pp === 'object' && pp.playerId && pp.positionId) {
              positions[String(pp.positionId)] = String(pp.playerId);
            }
          });
        }
        
        if (data.substitutes) {
          const parsedSubs = Array.isArray(data.substitutes)
            ? data.substitutes
            : JSON.parse(String(data.substitutes || '[]'));
          
          parsedSubs.forEach((sub: any) => {
            if (typeof sub === 'string') {
              subs.push(sub);
            }
          });
        }
        
        setPlayerPositions(positions);
        setSubstitutes(subs);
      } else {
        setExistingRecordId(null);
        const formations = getFormationsByFormat(gameFormatTyped);
        setSelectedFormation(formations.length > 0 ? formations[0].id : '');
      }
    } catch (error) {
      console.error('Error loading team selection:', error);
      toast({
        title: 'Error',
        description: 'Failed to load team selection',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFormationChange = (formationId: string) => {
    console.log('Changing formation to:', formationId);
    setSelectedFormation(formationId);
    const newPositions = getPositionsForFormation(formationId, gameFormatTyped);
    const newPositionStrings = newPositions.map(pos => String(pos));
    
    const updatedPlayerPositions: PositionPlayerMap = {};
    Object.keys(playerPositions).forEach(pos => {
      if (newPositionStrings.includes(pos)) {
        updatedPlayerPositions[pos] = playerPositions[pos];
      }
    });
    
    setPlayerPositions(updatedPlayerPositions);
  };

  const handlePlayerChange = (position: string, playerId: string) => {
    console.log('Assigning player', playerId, 'to position', position);
    setPlayerPositions(prev => ({
      ...prev,
      [position]: playerId
    }));
  };

  const handleCaptainChange = (captainId: string) => {
    console.log('Setting captain to:', captainId);
    setCaptainId(captainId === 'none' ? null : captainId);
  };

  const handleAddSubstitute = (playerId: string) => {
    if (playerId && playerId !== 'none' && !substitutes.includes(playerId)) {
      console.log('Adding substitute:', playerId);
      setSubstitutes([...substitutes, playerId]);
    }
  };

  const handleRemoveSubstitute = (playerId: string) => {
    console.log('Removing substitute:', playerId);
    setSubstitutes(substitutes.filter(id => id !== playerId));
  };

  const handleSaveTeamSelection = async () => {
    try {
      console.log('Saving team selection...');
      setSaving(true);
      
      const playerPositionsArray = Object.entries(playerPositions)
        .filter(([, playerId]) => playerId)
        .map(([positionId, playerId]) => ({
          positionId,
          playerId
        }));

      const substitutesArray = substitutes.filter(Boolean);

      console.log('Saving data:', {
        playerPositionsArray,
        substitutesArray,
        formation: selectedFormation,
        captain: captainId,
        existingRecordId
      });

      // Create properly typed upsert data object
      const baseUpsertData = {
        event_id: eventId,
        team_id: teamId,
        team_number: teamNumber,
        period_number: periodNumber,
        captain_id: captainId,
        formation: selectedFormation,
        player_positions: playerPositionsArray,
        substitutes: substitutesArray,
        performance_category_id: performanceCategoryId,
        duration_minutes: 45,
        updated_at: new Date().toISOString()
      };

      // Add id if we have an existing record
      const upsertData = existingRecordId 
        ? { ...baseUpsertData, id: existingRecordId }
        : baseUpsertData;

      const { data: upsertResult, error } = await supabase
        .from('event_selections')
        .upsert(upsertData, {
          onConflict: 'event_id,team_id,period_number,team_number'
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error saving team selection:', error);
        throw error;
      }

      if (upsertResult && !existingRecordId) {
        setExistingRecordId(upsertResult.id);
      }

      console.log('Team selection saved successfully');

      toast({
        title: 'Success',
        description: 'Team selection saved successfully',
      });
      
      // Reload players to update availability status
      await loadPlayers();
      
      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error('Error saving team selection:', error);
      toast({
        title: 'Error',
        description: 'Failed to save team selection',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player ? `${player.squadNumber}. ${player.name}` : '';
  };

  const getPlayerDisplayName = (player: Player) => {
    let displayName = `${player.squadNumber}. ${player.name}`;
    if (player.isSelectedInOtherTeam) {
      displayName += ` (Selected in Team ${player.selectedTeamNumber})`;
    }
    return displayName;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading player selection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FormationSelector 
        gameFormat={gameFormatTyped}
        selectedFormation={selectedFormation}
        onFormationChange={handleFormationChange}
      />
      
      <div className="space-y-2">
        <Label htmlFor="captainSelection">Captain</Label>
        <Select value={captainId || 'none'} onValueChange={handleCaptainChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select captain" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No captain selected</SelectItem>
            {players.map(player => (
              <SelectItem key={player.id} value={player.id}>
                {player.squadNumber}. {player.name}
                {player.isSelectedInOtherTeam && ` (Selected in Team ${player.selectedTeamNumber})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {positions.map((position) => (
              <div key={position} className="space-y-2">
                <Label htmlFor={`position-${position}`}>{position}</Label>
                <Select 
                  value={playerPositions[position] || 'none'} 
                  onValueChange={(value) => handlePlayerChange(position, value === 'none' ? '' : value)}
                >
                  <SelectTrigger id={`position-${position}`}>
                    <SelectValue placeholder={`Select player for ${position}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No player selected</SelectItem>
                    {players.map(player => (
                      <SelectItem 
                        key={player.id} 
                        value={player.id}
                      >
                        <span className={player.isSelectedInOtherTeam ? 'text-orange-600' : ''}>
                          {player.squadNumber}. {player.name}
                          {player.isSelectedInOtherTeam && ` (Selected in Team ${player.selectedTeamNumber})`}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <div className="space-y-2">
        <Label>Substitutes</Label>
        <div className="flex flex-wrap gap-2 mb-4">
          {substitutes.map(subId => {
            const player = players.find(p => p.id === subId);
            const playerName = player ? `${player.squadNumber}. ${player.name}` : '';
            return (
              <div key={subId} className="bg-gray-100 px-3 py-1 rounded-full flex items-center">
                <span>{playerName}</span>
                <button 
                  className="ml-2 text-red-500 hover:text-red-700"
                  onClick={() => handleRemoveSubstitute(subId)}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
        
        <Select 
          value="none" 
          onValueChange={handleAddSubstitute}
        >
          <SelectTrigger>
            <SelectValue placeholder="Add substitute" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Select player</SelectItem>
            {players
              .filter(player => !substitutes.includes(player.id))
              .map(player => (
                <SelectItem 
                  key={player.id} 
                  value={player.id}
                >
                  <span className={player.isSelectedInOtherTeam ? 'text-orange-600' : ''}>
                    {player.squadNumber}. {player.name}
                    {player.isSelectedInOtherTeam && ` (Selected in Team ${player.selectedTeamNumber})`}
                  </span>
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex justify-end mt-4">
        <Button 
          onClick={handleSaveTeamSelection} 
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Selection'}
        </Button>
      </div>
    </div>
  );
};
