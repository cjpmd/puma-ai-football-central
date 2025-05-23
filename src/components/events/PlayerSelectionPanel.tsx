
import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormationSelector } from './FormationSelector';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getFormationsByFormat, getPositionsForFormation } from '@/utils/formationUtils';
import { GameFormat, Position } from '@/types';

interface PlayerSelectionPanelProps {
  eventId: string;
  teamId: string;
  gameFormat: string;
  periodNumber: number;
}

interface Player {
  id: string;
  name: string;
  squadNumber: number;
  position?: string;
}

interface PlayerPosition {
  playerId: string;
  positionId: string;
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
  periodNumber
}) => {
  // Cast gameFormat to the correct type for the utility functions
  const gameFormatTyped = gameFormat as GameFormat;
  
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedFormation, setSelectedFormation] = useState('');
  const [positions, setPositions] = useState<string[]>([]);
  const [playerPositions, setPlayerPositions] = useState<{[position: string]: string}>({});
  const [substitutes, setSubstitutes] = useState<string[]>([]);
  const [captainId, setCaptainId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadPlayers();
    loadTeamSelection();
  }, [eventId, teamId, periodNumber]);

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
        .eq('team_number', 1)
        .eq('period_number', periodNumber)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        throw error;
      }

      if (data) {
        // Set formation
        setSelectedFormation(data.formation || '');
        setCaptainId(data.captain_id);
        
        // Parse player positions and substitutes
        let positions: {[position: string]: string} = {};
        let subs: string[] = [];
        
        if (data.player_positions) {
          const parsedPositions = typeof data.player_positions === 'string' 
            ? JSON.parse(data.player_positions) 
            : data.player_positions;
            
          parsedPositions.forEach((pp: {playerId: string, positionId: string}) => {
            positions[pp.positionId] = pp.playerId;
          });
        }
        
        if (data.substitutes) {
          subs = typeof data.substitutes === 'string'
            ? JSON.parse(data.substitutes)
            : data.substitutes;
        }
        
        setPlayerPositions(positions);
        setSubstitutes(subs);
      } else {
        // Initialize with default values
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
    // When formation changes, keep player assignments for positions that still exist
    const newPositions = getPositionsForFormation(formationId, gameFormatTyped);
    
    const updatedPlayerPositions: {[position: string]: string} = {};
    Object.keys(playerPositions).forEach(pos => {
      if (newPositions.includes(pos as Position)) {
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

  const isPlayerAssigned = (playerId: string) => {
    return Object.values(playerPositions).includes(playerId) || substitutes.includes(playerId);
  };

  if (loading) {
    return <div>Loading player selection...</div>;
  }

  // Get available players for selection (not assigned to other positions)
  const getAvailablePlayersForPosition = (currentPosition: string) => {
    return players.filter(player => 
      // Include if either:
      // 1. Player is not assigned to any position
      // 2. Player is assigned to this position
      // 3. We want to allow players to be selected for multiple positions
      !isPlayerAssigned(player.id) || playerPositions[currentPosition] === player.id
    );
  };

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player ? `${player.squadNumber}. ${player.name}` : '';
  };

  return (
    <div className="space-y-4">
      {/* Formation Selector */}
      <FormationSelector 
        gameFormat={gameFormatTyped}
        selectedFormation={selectedFormation}
        onFormationChange={handleFormationChange}
      />
      
      {/* Captain Selection */}
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
      
      {/* Player Position Selection */}
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
                        className={isPlayerAssigned(player.id) && playerPositions[position] !== player.id ? 
                          "text-gray-400" : ""}
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
      
      {/* Substitutes Selection */}
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
                  className={isPlayerAssigned(player.id) ? "text-gray-400" : ""}
                >
                  {player.squadNumber}. {player.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
