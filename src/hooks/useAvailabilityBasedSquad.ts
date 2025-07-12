
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { availabilityService } from '@/services/availabilityService';

export interface AvailablePlayer {
  id: string;
  name: string;
  squadNumber: number;
  type: 'goalkeeper' | 'outfield';
  availabilityStatus: 'available' | 'unavailable' | 'pending';
  isAssignedToSquad: boolean;
  squadRole?: 'player' | 'captain' | 'vice_captain';
}

export const useAvailabilityBasedSquad = (teamId: string, eventId?: string) => {
  const [availablePlayers, setAvailablePlayers] = useState<AvailablePlayer[]>([]);
  const [squadPlayers, setSquadPlayers] = useState<AvailablePlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const loadAvailabilityBasedData = async () => {
    if (!teamId) {
      console.log('No teamId provided, clearing data');
      setAvailablePlayers([]);
      setSquadPlayers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Loading availability-based squad data for team:', teamId, 'event:', eventId);

      // Load all team players first
      const { data: teamPlayers, error: playersError } = await supabase
        .from('players')
        .select('id, name, squad_number, type')
        .eq('team_id', teamId)
        .eq('status', 'active')
        .order('squad_number');

      if (playersError) {
        console.error('Error loading team players:', playersError);
        throw playersError;
      }

      console.log('Team players loaded:', teamPlayers?.length || 0);

      // Convert to expected format with proper type conversion
      let playersWithAvailability = (teamPlayers || []).map(player => ({
        id: player.id,
        name: player.name,
        squadNumber: player.squad_number,
        type: (player.type === 'goalkeeper' ? 'goalkeeper' : 'outfield') as 'goalkeeper' | 'outfield',
        availabilityStatus: 'pending' as const,
        isAssignedToSquad: false,
        squadRole: 'player' as const
      }));

      // Try to get availability data if eventId is provided
      if (eventId) {
        try {
          const availabilityData = await availabilityService.getPlayerAvailabilityFromParents(eventId, teamId);
          console.log('Availability data loaded:', availabilityData.length);
          
          // Update availability status for players who have responses
          playersWithAvailability = playersWithAvailability.map(player => {
            const availabilityRecord = availabilityData.find(a => a.id === player.id);
            return availabilityRecord ? { ...player, ...availabilityRecord } : player;
          });
        } catch (error) {
          console.warn('Could not load availability data:', error);
          // Continue with pending status for all players
        }
      }

      // Get squad assignments - CRITICAL: Filter by BOTH team_id AND event_id
      let squadAssignmentMap = new Map();
      if (eventId) {
        const { data: squadData, error: squadError } = await supabase
          .from('team_squads')
          .select('player_id, squad_role')
          .eq('team_id', teamId)
          .eq('event_id', eventId);

        if (!squadError && squadData) {
          console.log(`Squad assignments for team ${teamId}, event ${eventId}:`, squadData);
          squadData.forEach(squad => {
            squadAssignmentMap.set(squad.player_id, squad.squad_role);
          });
        } else if (squadError) {
          console.error('Error loading squad assignments:', squadError);
        }
      }

      // Update players with squad assignment status
      const updatedPlayers = playersWithAvailability.map(player => ({
        ...player,
        isAssignedToSquad: squadAssignmentMap.has(player.id),
        squadRole: (squadAssignmentMap.get(player.id) || 'player') as 'player' | 'captain' | 'vice_captain'
      }));

      console.log(`Team ${teamId} final player breakdown:`, {
        total: updatedPlayers.length,
        assigned: updatedPlayers.filter(p => p.isAssignedToSquad).length,
        available: updatedPlayers.filter(p => !p.isAssignedToSquad).length
      });

      // Split players ensuring no overlap
      const available = updatedPlayers.filter(p => !p.isAssignedToSquad);
      const squad = updatedPlayers.filter(p => p.isAssignedToSquad);

      console.log(`Team ${teamId} - Available: ${available.length}, Squad: ${squad.length}`);

      setAvailablePlayers(available);
      setSquadPlayers(squad);
    } catch (error) {
      console.error('Error loading availability-based squad data:', error);
      setAvailablePlayers([]);
      setSquadPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  const assignPlayerToSquad = async (playerId: string, squadRole: 'player' | 'captain' | 'vice_captain' = 'player') => {
    if (!user || !eventId) return;

    try {
      console.log(`Assigning player ${playerId} to team ${teamId} squad for event ${eventId}`);

      // Check if player is already assigned to ANY team for this event
      const { data: existingAssignment, error: checkError } = await supabase
        .from('team_squads')
        .select('team_id')
        .eq('player_id', playerId)
        .eq('event_id', eventId);

      if (checkError) throw checkError;

      if (existingAssignment && existingAssignment.length > 0) {
        const assignedTeamId = existingAssignment[0].team_id;
        if (assignedTeamId !== teamId) {
          throw new Error(`Player is already assigned to team ${assignedTeamId} for this event`);
        }
        // If already assigned to this team, just update the role
        const { error: updateError } = await supabase
          .from('team_squads')
          .update({ squad_role: squadRole })
          .eq('team_id', teamId)
          .eq('player_id', playerId)
          .eq('event_id', eventId);

        if (updateError) throw updateError;
      } else {
        // Insert new assignment
        const { error } = await supabase
          .from('team_squads')
          .insert({
            team_id: teamId,
            player_id: playerId,
            event_id: eventId,
            squad_role: squadRole,
            availability_status: 'available',
            added_by: user.id
          });

        if (error) throw error;
      }

      // Update local state immediately to prevent UI issues
      const playerToMove = availablePlayers.find(p => p.id === playerId);
      if (playerToMove) {
        const updatedPlayer = { 
          ...playerToMove, 
          isAssignedToSquad: true, 
          squadRole: squadRole as 'player' | 'captain' | 'vice_captain'
        };
        
        setSquadPlayers(prev => {
          const filtered = prev.filter(p => p.id !== playerId);
          return [...filtered, updatedPlayer];
        });
        setAvailablePlayers(prev => prev.filter(p => p.id !== playerId));
      }

      console.log(`Successfully assigned player ${playerId} to team ${teamId}`);
    } catch (error) {
      console.error('Error in assignPlayerToSquad:', error);
      throw error;
    }
  };

  const removePlayerFromSquad = async (playerId: string) => {
    if (!eventId) return;

    try {
      console.log(`Removing player ${playerId} from team ${teamId} squad for event ${eventId}`);

      const { error } = await supabase
        .from('team_squads')
        .delete()
        .eq('team_id', teamId)
        .eq('player_id', playerId)
        .eq('event_id', eventId);

      if (error) {
        console.error('Error removing player from squad:', error);
        throw error;
      }

      // Update local state immediately
      const playerToMove = squadPlayers.find(p => p.id === playerId);
      if (playerToMove) {
        const updatedPlayer: AvailablePlayer = { 
          ...playerToMove, 
          isAssignedToSquad: false, 
          squadRole: 'player' as 'player' | 'captain' | 'vice_captain'
        };
        
        setAvailablePlayers(prev => {
          const filtered = prev.filter(p => p.id !== playerId);
          return [...filtered, updatedPlayer];
        });
        setSquadPlayers(prev => prev.filter(p => p.id !== playerId));
      }

      console.log(`Successfully removed player ${playerId} from team ${teamId}`);
    } catch (error) {
      console.error('Error in removePlayerFromSquad:', error);
      throw error;
    }
  };

  const updateSquadRole = async (playerId: string, squadRole: 'player' | 'captain' | 'vice_captain') => {
    if (!eventId) return;

    try {
      console.log(`Updating squad role for player ${playerId} in team ${teamId} to ${squadRole}`);

      const { error } = await supabase
        .from('team_squads')
        .update({ squad_role: squadRole })
        .eq('team_id', teamId)
        .eq('player_id', playerId)
        .eq('event_id', eventId);

      if (error) {
        console.error('Error updating squad role:', error);
        throw error;
      }

      // Update local state
      setSquadPlayers(prev => prev.map(player => 
        player.id === playerId 
          ? { ...player, squadRole: squadRole }
          : player
      ));

      console.log(`Successfully updated squad role for player ${playerId} in team ${teamId}`);
    } catch (error) {
      console.error('Error in updateSquadRole:', error);
      throw error;
    }
  };

  useEffect(() => {
    loadAvailabilityBasedData();
  }, [teamId, eventId]);

  return {
    availablePlayers,
    squadPlayers,
    loading,
    assignPlayerToSquad,
    removePlayerFromSquad,
    updateSquadRole,
    reload: loadAvailabilityBasedData
  };
};
