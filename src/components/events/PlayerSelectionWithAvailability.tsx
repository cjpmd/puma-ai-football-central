
import { useState, useEffect } from 'react';
import { PlayerSelectionPanel } from './PlayerSelectionPanel';
import { availabilityService } from '@/services/availabilityService';
import { Badge } from '@/components/ui/badge';
import { AvailabilityStatusBadge } from './AvailabilityStatusBadge';
import { supabase } from '@/integrations/supabase/client';

interface Player {
  id: string;
  name: string;
  squad_number: number;
  subscription_type: string;
  subscription_status: string;
  status: string;
  availability_status?: 'pending' | 'available' | 'unavailable';
}

interface PlayerSelectionWithAvailabilityProps {
  teamId: string;
  eventId: string;
  selectedPlayers: string[];
  substitutePlayers?: string[];
  captainId?: string;
  onPlayersChange: (players: string[]) => void;
  onSubstitutesChange?: (substitutes: string[]) => void;
  onCaptainChange: (captainId: string) => void;
  eventType?: string;
  formation?: string;
  onFormationChange?: (formation: string) => void;
  gameFormat?: any;
  teamNumber?: number;
  periodNumber?: number;
}

export const PlayerSelectionWithAvailability: React.FC<PlayerSelectionWithAvailabilityProps> = (props) => {
  const [playerAvailabilities, setPlayerAvailabilities] = useState<Record<string, string>>({});
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  
  // Remember filter state using localStorage with event-specific key
  const filterStorageKey = `showAllPlayers_${props.eventId}_${props.teamNumber}_${props.periodNumber}`;
  const [showAllPlayers, setShowAllPlayers] = useState(() => {
    const saved = localStorage.getItem(filterStorageKey);
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    loadPlayerAvailabilities();
    loadTeamPlayers();
  }, [props.eventId, props.teamId]);

  // Save filter state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(filterStorageKey, JSON.stringify(showAllPlayers));
  }, [showAllPlayers, filterStorageKey]);

  const loadPlayerAvailabilities = async () => {
    try {
      const availabilities = await availabilityService.getEventAvailability(props.eventId);
      const availabilityMap: Record<string, string> = {};
      
      availabilities.forEach(availability => {
        if (availability.role === 'player') {
          availabilityMap[availability.user_id] = availability.status;
        }
      });
      
      setPlayerAvailabilities(availabilityMap);
    } catch (error) {
      console.error('Error loading player availabilities:', error);
    }
  };

  const loadTeamPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', props.teamId)
        .eq('status', 'active')
        .order('squad_number');

      if (error) throw error;
      setAllPlayers(data || []);
    } catch (error) {
      console.error('Error loading team players:', error);
    }
  };

  const filterUnavailablePlayers = (playerIds: string[]) => {
    return playerIds.filter(playerId => {
      const availability = playerAvailabilities[playerId];
      return availability !== 'unavailable';
    });
  };

  const handlePlayersChange = (players: string[]) => {
    const filteredPlayers = filterUnavailablePlayers(players);
    props.onPlayersChange(filteredPlayers);
  };

  const handleSubstitutesChange = (substitutes: string[]) => {
    if (props.onSubstitutesChange) {
      const filteredSubstitutes = filterUnavailablePlayers(substitutes);
      props.onSubstitutesChange(filteredSubstitutes);
    }
  };

  const handlePlayerRemove = (playerId: string) => {
    const newPlayers = props.selectedPlayers.filter(id => id !== playerId);
    props.onPlayersChange(newPlayers);

    if (props.substitutePlayers && props.onSubstitutesChange) {
      const newSubstitutes = props.substitutePlayers.filter(id => id !== playerId);
      props.onSubstitutesChange(newSubstitutes);
    }

    // Only remove captain if they're not in substitutes
    if (props.captainId === playerId && !props.substitutePlayers?.includes(playerId)) {
      props.onCaptainChange('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Availability Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm p-4 bg-gray-50 rounded-lg">
        <span className="font-medium">Availability Status:</span>
        <div className="flex flex-wrap items-center gap-3">
          <AvailabilityStatusBadge status="available" />
          <AvailabilityStatusBadge status="pending" />
          <AvailabilityStatusBadge status="unavailable" />
        </div>
      </div>

      <PlayerSelectionPanel
        {...props}
        onPlayersChange={handlePlayersChange}
        onSubstitutesChange={handleSubstitutesChange}
        showFormationView={true}
        showSubstitutesInFormation={true}
        showAllPlayers={showAllPlayers}
        onShowAllPlayersChange={setShowAllPlayers}
        allowCaptainAsSubstitute={true}
      />
    </div>
  );
};
