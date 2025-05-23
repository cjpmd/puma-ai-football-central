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
}

type PositionPlayerMap = Record<string, string>;

interface PlayerPosition {
  playerId: string;
  positionId: string;
  [key: string]: any; // Add index signature for Json compatibility
}

interface TeamSelection {
  id?: string;
  captainId: string | null;
  formationId: string;
  playerPositions: PlayerPosition[];
  substitutes: string[];
}

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
  const { toast } = useToast();

  useEffect(() => {
    loadPlayers();
    loadTeamSelection();
  }, [eventId, teamId, periodNumber, teamNumber, performanceCategoryId]);

  useEffect(() => {
    if (selectedFormation) {
      const formationPositions = getPositionsForFormation(selectedFormation, gameFormatTyped);
      setPositions(formationPositions);
    }
  }, [selectedFormation, gameFormatTyped]);

  const loadPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('id, name, squad_number')
        .eq('team_id', teamId)
        .eq('status', 'active')
        .order('squad_number');

      if (error) throw error;

      setPlayers(data?.map(p => ({
        id: p.id,
        name: p.name,
        squadNumber: p.squad_number
      })) || []);
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
      const { data, error } = await supabase
        .from('event_selections')
        .select('*')
        .eq('event_id', eventId)
        .eq('team_id', teamId)
        .eq('team_number', teamNumber)
        .eq('period_number', periodNumber)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
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
    setPlayerPositions(prev => ({
      ...prev,
      [position]: playerId
    }));
  };

  const handleCaptainChange = (captainId: string) => {
    setCaptainId(captainId === 'none' ? null : captainId);
  };

  const handleAddSubstitute = (playerId: string) => {
    if (playerId && playerId !== 'none' && !substitutes.includes(playerId)) {
      setSubstitutes([...substitutes, playerId]);
    }
  };

  const handleRemoveSubstitute = (playerId: string) => {
    setSubstitutes(substitutes.filter(id => id !== playerId));
  };

  const handleSaveTeamSelection = async () => {
    try {
      setSaving(true);
      
      const playerPositionsArray: PlayerPosition[] = Object.entries(playerPositions).map(
        ([positionId, playerId]) => ({
          positionId,
          playerId: playerId || ''
        })
      ).filter(pp => pp.playerId);

      const { data: existingData, error: checkError } = await supabase
        .from('event_selections')
        .select('id')
        .eq('event_id', eventId)
        .eq('team_id', teamId)
        .eq('team_number', teamNumber)
        .eq('period_number', periodNumber)
        .maybeSingle();

      if (checkError) throw checkError;

      // Convert to Json-compatible format
      const playerPositionsJson = playerPositionsArray as any;
      const substitutesJson = substitutes as any;

      if (existingData?.id) {
        const { error } = await supabase
          .from('event_selections')
          .update({
            captain_id: captainId,
            formation: selectedFormation,
            player_positions: playerPositionsJson,
            substitutes: substitutesJson,
            performance_category_id: performanceCategoryId,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingData.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('event_selections')
          .insert({
            event_id: eventId,
            team_id: teamId,
            team_number: teamNumber,
            period_number: periodNumber,
            captain_id: captainId,
            formation: selectedFormation,
            player_positions: playerPositionsJson,
            substitutes: substitutesJson,
            performance_category_id: performanceCategoryId,
            duration_minutes: 45,
          });

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'Team selection saved successfully',
      });
      
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

  if (loading) {
    return <div>Loading player selection...</div>;
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
                        {player.squadNumber}. {player.name}
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
          {substitutes.map(subId => (
            <div key={subId} className="bg-gray-100 px-3 py-1 rounded-full flex items-center">
              <span>{getPlayerName(subId)}</span>
              <button 
                className="ml-2 text-red-500 hover:text-red-700"
                onClick={() => handleRemoveSubstitute(subId)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        
        <Select 
          value="none" 
          onValueChange={(value) => {
            if (value !== 'none') {
              handleAddSubstitute(value);
            }
          }}
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
                  {player.squadNumber}. {player.name}
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
