
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
      console.log(`[Team ${teamId}] Loading availability-based squad data for event:`, eventId);

      // Load all team players first - ONLY for this specific team
      const { data: teamPlayers, error: playersError } = await supabase
        .from('players')
        .select('id, name, squad_number, type')
        .eq('team_id', teamId)
        .eq('status', 'active')
        .order('squad_number');

      if (playersError) {
        console.error(`[Team ${teamId}] Error loading team players:`, playersError);
        throw playersError;
      }

      console.log(`[Team ${teamId}] Team players loaded:`, teamPlayers?.length || 0);

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
          console.log(`[Team ${teamId}] Availability data loaded:`, availabilityData.length);
          
          // Update availability status for players who have responses
          playersWithAvailability = playersWithAvailability.map(player => {
            const availabilityRecord = availabilityData.find(a => a.id === player.id);
            return availabilityRecord ? { ...player, ...availabilityRecord } : player;
          });
        } catch (error) {
          console.warn(`[Team ${teamId}] Could not load availability data:`, error);
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
          console.log(`[Team ${teamId}] Squad assignments for event ${eventId}:`, squadData);
          squadData.forEach(squad => {
            squadAssignmentMap.set(squad.player_id, squad.squad_role);
          });
        } else if (squadError) {
          console.error(`[Team ${teamId}] Error loading squad assignments:`, squadError);
        }
      }

      // Update players with squad assignment status - ONLY for this team's players
      const updatedPlayers = playersWithAvailability.map(player => ({
        ...player,
        isAssignedToSquad: squadAssignmentMap.has(player.id),
        squadRole: (squadAssignmentMap.get(player.id) || 'player') as 'player' | 'captain' | 'vice_captain'
      }));

      console.log(`[Team ${teamId}] Final player breakdown:`, {
        total: updatedPlayers.length,
        assigned: updatedPlayers.filter(p => p.isAssignedToSquad).length,
        available: updatedPlayers.filter(p => !p.isAssignedToSquad).length
      });

      // Split players ensuring no overlap - THIS IS THE KEY FIX
      const available = updatedPlayers.filter(p => !p.isAssignedToSquad);
      const squad = updatedPlayers.filter(p => p.isAssignedToSquad);

      console.log(`[Team ${teamId}] Setting state - Available: ${available.length}, Squad: ${squad.length}`);

      // Set state with completely separate arrays for this team only
      setAvailablePlayers([...available]);
      setSquadPlayers([...squad]);
    } catch (error) {
      console.error(`[Team ${teamId}] Error loading availability-based squad data:`, error);
      setAvailablePlayers([]);
      setSquadPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  const assignPlayerToSquad = async (playerId: string, squadRole: 'player' | 'captain' | 'vice_captain' = 'player') => {
    if (!user || !eventId) return;

    try {
      console.log(`[Team ${teamId}] Assigning player ${playerId} to squad for event ${eventId}`);

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
        // Insert new assignment - SCOPED TO THIS TEAM ONLY
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

      // Update local state immediately - ONLY for this team's hook instance
      setAvailablePlayers(prev => {
        const filtered = prev.filter(p => p.id !== playerId);
        console.log(`[Team ${teamId}] Updated available players:`, filtered.length);
        return filtered;
      });

      setSquadPlayers(prev => {
        const playerToMove = availablePlayers.find(p => p.id === playerId);
        if (playerToMove) {
          const updatedPlayer = { 
            ...playerToMove, 
            isAssignedToSquad: true, 
            squadRole: squadRole as 'player' | 'captain' | 'vice_captain'
          };
          const newSquad = [...prev.filter(p => p.id !== playerId), updatedPlayer];
          console.log(`[Team ${teamId}] Updated squad players:`, newSquad.length);
          return newSquad;
        }
        return prev;
      });

      console.log(`[Team ${teamId}] Successfully assigned player ${playerId}`);
    } catch (error) {
      console.error(`[Team ${teamId}] Error in assignPlayerToSquad:`, error);
      throw error;
    }
  };

  const removePlayerFromSquad = async (playerId: string) => {
    if (!eventId) return;

    try {
      console.log(`[Team ${teamId}] Removing player ${playerId} from squad for event ${eventId}`);

      const { error } = await supabase
        .from('team_squads')
        .delete()
        .eq('team_id', teamId)
        .eq('player_id', playerId)
        .eq('event_id', eventId);

      if (error) {
        console.error(`[Team ${teamId}] Error removing player from squad:`, error);
        throw error;
      }

      // Update local state immediately - ONLY for this team's hook instance
      setSquadPlayers(prev => {
        const filtered = prev.filter(p => p.id !== playerId);
        console.log(`[Team ${teamId}] Updated squad players after removal:`, filtered.length);
        return filtered;
      });

      setAvailablePlayers(prev => {
        const playerToMove = squadPlayers.find(p => p.id === playerId);
        if (playerToMove) {
          const updatedPlayer: AvailablePlayer = { 
            ...playerToMove, 
            isAssignedToSquad: false, 
            squadRole: 'player' as 'player' | 'captain' | 'vice_captain'
          };
          const newAvailable = [...prev.filter(p => p.id !== playerId), updatedPlayer];
          console.log(`[Team ${teamId}] Updated available players after removal:`, newAvailable.length);
          return newAvailable;
        }
        return prev;
      });

      console.log(`[Team ${teamId}] Successfully removed player ${playerId}`);
    } catch (error) {
      console.error(`[Team ${teamId}] Error in removePlayerFromSquad:`, error);
      throw error;
    }
  };

  const updateSquadRole = async (playerId: string, squadRole: 'player' | 'captain' | 'vice_captain') => {
    if (!eventId) return;

    try {
      console.log(`[Team ${teamId}] Updating squad role for player ${playerId} to ${squadRole}`);

      const { error } = await supabase
        .from('team_squads')
        .update({ squad_role: squadRole })
        .eq('team_id', teamId)
        .eq('player_id', playerId)
        .eq('event_id', eventId);

      if (error) {
        console.error(`[Team ${teamId}] Error updating squad role:`, error);
        throw error;
      }

      // Update local state - ONLY for this team's hook instance
      setSquadPlayers(prev => prev.map(player => 
        player.id === playerId 
          ? { ...player, squadRole: squadRole }
          : player
      ));

      console.log(`[Team ${teamId}] Successfully updated squad role for player ${playerId}`);
    } catch (error) {
      console.error(`[Team ${teamId}] Error in updateSquadRole:`, error);
      throw error;
    }
  };

  useEffect(() => {
    console.log(`[Team ${teamId}] Effect triggered - reloading data for event:`, eventId);
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
