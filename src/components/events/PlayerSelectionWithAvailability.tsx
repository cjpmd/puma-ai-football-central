
import { useState, useEffect } from 'react';
import { PlayerSelectionPanel } from './PlayerSelectionPanel';
import { availabilityService } from '@/services/availabilityService';
import { Badge } from '@/components/ui/badge';
import { AvailabilityStatusBadge } from './AvailabilityStatusBadge';

interface PlayerWithAvailability {
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
  showFormationView?: boolean;
  formation?: string;
  onFormationChange?: (formation: string) => void;
  gameFormat?: any;
  teamNumber?: number;
  periodNumber?: number;
  showSubstitutesInFormation?: boolean;
}

export const PlayerSelectionWithAvailability: React.FC<PlayerSelectionWithAvailabilityProps> = (props) => {
  const [playerAvailabilities, setPlayerAvailabilities] = useState<Record<string, string>>({});

  useEffect(() => {
    loadPlayerAvailabilities();
  }, [props.eventId]);

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

  // Filter out unavailable players from selection
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

  return (
    <div className="space-y-4">
      {/* Availability Legend */}
      <div className="flex items-center gap-4 text-sm">
        <span className="font-medium">Availability Status:</span>
        <div className="flex items-center gap-3">
          <AvailabilityStatusBadge status="available" />
          <AvailabilityStatusBadge status="pending" />
          <AvailabilityStatusBadge status="unavailable" />
        </div>
      </div>

      <PlayerSelectionPanel
        {...props}
        onPlayersChange={handlePlayersChange}
        onSubstitutesChange={handleSubstitutesChange}
        // Note: You would extend PlayerSelectionPanel to show availability badges
        // alongside each player name in the actual implementation
      />
    </div>
  );
};
