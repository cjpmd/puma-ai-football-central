
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

  console.log(`[HOOK INIT] useAvailabilityBasedSquad for team ${teamId}, event ${eventId}`);

  const loadAvailabilityBasedData = async () => {
    if (!teamId) {
      console.log(`[${teamId}] No teamId provided, clearing data`);
      setAvailablePlayers([]);
      setSquadPlayers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log(`[${teamId}] Loading availability-based squad data for event:`, eventId);

      // Load all team players first - ONLY for this specific team
      const { data: teamPlayers, error: playersError } = await supabase
        .from('players')
        .select('id, name, squad_number, type')
        .eq('team_id', teamId)
        .eq('status', 'active')
        .order('squad_number');

      if (playersError) {
        console.error(`[${teamId}] Error loading team players:`, playersError);
        throw playersError;
      }

      console.log(`[${teamId}] Team players loaded:`, teamPlayers?.length || 0);

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
          console.log(`[${teamId}] Availability data loaded:`, availabilityData.length);
          
          // Update availability status for players who have responses
          playersWithAvailability = playersWithAvailability.map(player => {
            const availabilityRecord = availabilityData.find(a => a.id === player.id);
            return availabilityRecord ? { ...player, ...availabilityRecord } : player;
          });
        } catch (error) {
          console.warn(`[${teamId}] Could not load availability data:`, error);
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
          console.log(`[${teamId}] Squad assignments for event ${eventId}:`, squadData);
          squadData.forEach(squad => {
            squadAssignmentMap.set(squad.player_id, squad.squad_role);
          });
        } else if (squadError) {
          console.error(`[${teamId}] Error loading squad assignments:`, squadError);
        }
      }

      // Update players with squad assignment status - ONLY for this team's players
      const updatedPlayers = playersWithAvailability.map(player => ({
        ...player,
        isAssignedToSquad: squadAssignmentMap.has(player.id),
        squadRole: (squadAssignmentMap.get(player.id) || 'player') as 'player' | 'captain' | 'vice_captain'
      }));

      console.log(`[${teamId}] Final player breakdown:`, {
        total: updatedPlayers.length,
        assigned: updatedPlayers.filter(p => p.isAssignedToSquad).length,
        available: updatedPlayers.filter(p => !p.isAssignedToSquad).length
      });

      // Split players ensuring no overlap - THIS IS THE KEY FIX
      const available = updatedPlayers.filter(p => !p.isAssignedToSquad);
      const squad = updatedPlayers.filter(p => p.isAssignedToSquad);

      console.log(`[${teamId}] Setting state - Available: ${available.length}, Squad: ${squad.length}`);

      // Set state with completely separate arrays for this team only
      setAvailablePlayers([...available]);
      setSquadPlayers([...squad]);
    } catch (error) {
      console.error(`[${teamId}] Error loading availability-based squad data:`, error);
      setAvailablePlayers([]);
      setSquadPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  const assignPlayerToSquad = async (playerId: string, squadRole: 'player' | 'captain' | 'vice_captain' = 'player') => {
    if (!user || !eventId) {
      console.error(`[${teamId}] Cannot assign player - missing user or eventId`);
      return;
    }

    try {
      console.log(`[${teamId}] Assigning player ${playerId} to squad for event ${eventId}`);

      // First, check if this player is already assigned to THIS SPECIFIC TEAM for this event
      const { data: existingAssignment, error: checkError } = await supabase
        .from('team_squads')
        .select('team_id, player_id')
        .eq('player_id', playerId)
        .eq('event_id', eventId)
        .eq('team_id', teamId); // Critical: check for THIS team specifically

      if (checkError) {
        console.error(`[${teamId}] Error checking existing assignment:`, checkError);
        throw checkError;
      }

      if (existingAssignment && existingAssignment.length > 0) {
        console.log(`[${teamId}] Player already assigned to this team, updating role`);
        // Player already assigned to this team, just update the role
        const { error: updateError } = await supabase
          .from('team_squads')
          .update({ squad_role: squadRole })
          .eq('team_id', teamId)
          .eq('player_id', playerId)
          .eq('event_id', eventId);

        if (updateError) {
          console.error(`[${teamId}] Error updating squad role:`, updateError);
          throw updateError;
        }
      } else {
        // Check if player is assigned to ANY OTHER team for this event
        const { data: otherTeamAssignment, error: otherTeamError } = await supabase
          .from('team_squads')
          .select('team_id')
          .eq('player_id', playerId)
          .eq('event_id', eventId)
          .neq('team_id', teamId);

        if (otherTeamError) {
          console.error(`[${teamId}] Error checking other team assignments:`, otherTeamError);
          throw otherTeamError;
        }

        if (otherTeamAssignment && otherTeamAssignment.length > 0) {
          const otherTeamId = otherTeamAssignment[0].team_id;
          console.error(`[${teamId}] Player ${playerId} is already assigned to team ${otherTeamId} for this event`);
          throw new Error(`Player is already assigned to another team for this event`);
        }

        // Insert new assignment - SCOPED TO THIS TEAM ONLY
        const { error: insertError } = await supabase
          .from('team_squads')
          .insert({
            team_id: teamId,
            player_id: playerId,
            event_id: eventId,
            squad_role: squadRole,
            availability_status: 'available',
            added_by: user.id
          });

        if (insertError) {
          console.error(`[${teamId}] Error inserting squad assignment:`, insertError);
          throw insertError;
        }
      }

      // Update local state immediately - ONLY for this team's hook instance
      const playerToMove = availablePlayers.find(p => p.id === playerId);
      if (playerToMove) {
        console.log(`[${teamId}] Moving player ${playerId} from available to squad`);
        
        // Remove from available players
        const newAvailablePlayers = availablePlayers.filter(p => p.id !== playerId);
        setAvailablePlayers(newAvailablePlayers);
        
        // Add to squad players
        const updatedPlayer = { 
          ...playerToMove, 
          isAssignedToSquad: true, 
          squadRole: squadRole as 'player' | 'captain' | 'vice_captain'
        };
        const newSquadPlayers = [...squadPlayers.filter(p => p.id !== playerId), updatedPlayer];
        setSquadPlayers(newSquadPlayers);
        
        console.log(`[${teamId}] State updated - Available: ${newAvailablePlayers.length}, Squad: ${newSquadPlayers.length}`);
      } else {
        console.warn(`[${teamId}] Player ${playerId} not found in available players`);
      }

      console.log(`[${teamId}] Successfully assigned player ${playerId}`);
    } catch (error) {
      console.error(`[${teamId}] Error in assignPlayerToSquad:`, error);
      throw error;
    }
  };

  const removePlayerFromSquad = async (playerId: string) => {
    if (!eventId) {
      console.error(`[${teamId}] Cannot remove player - missing eventId`);
      return;
    }

    try {
      console.log(`[${teamId}] Removing player ${playerId} from squad for event ${eventId}`);

      // Remove from database - SCOPED TO THIS TEAM AND EVENT
      const { error } = await supabase
        .from('team_squads')
        .delete()
        .eq('team_id', teamId)
        .eq('player_id', playerId)
        .eq('event_id', eventId);

      if (error) {
        console.error(`[${teamId}] Error removing player from squad:`, error);
        throw error;
      }

      // Update local state immediately - ONLY for this team's hook instance
      const playerToMove = squadPlayers.find(p => p.id === playerId);
      if (playerToMove) {
        console.log(`[${teamId}] Moving player ${playerId} from squad to available`);
        
        // Remove from squad players
        const newSquadPlayers = squadPlayers.filter(p => p.id !== playerId);
        setSquadPlayers(newSquadPlayers);
        
        // Add to available players
        const updatedPlayer: AvailablePlayer = { 
          ...playerToMove, 
          isAssignedToSquad: false, 
          squadRole: 'player' as 'player' | 'captain' | 'vice_captain'
        };
        const newAvailablePlayers = [...availablePlayers.filter(p => p.id !== playerId), updatedPlayer];
        setAvailablePlayers(newAvailablePlayers);
        
        console.log(`[${teamId}] State updated after removal - Available: ${newAvailablePlayers.length}, Squad: ${newSquadPlayers.length}`);
      } else {
        console.warn(`[${teamId}] Player ${playerId} not found in squad players`);
      }

      console.log(`[${teamId}] Successfully removed player ${playerId}`);
    } catch (error) {
      console.error(`[${teamId}] Error in removePlayerFromSquad:`, error);
      throw error;
    }
  };

  const updateSquadRole = async (playerId: string, squadRole: 'player' | 'captain' | 'vice_captain') => {
    if (!eventId) return;

    try {
      console.log(`[${teamId}] Updating squad role for player ${playerId} to ${squadRole}`);

      const { error } = await supabase
        .from('team_squads')
        .update({ squad_role: squadRole })
        .eq('team_id', teamId)
        .eq('player_id', playerId)
        .eq('event_id', eventId);

      if (error) {
        console.error(`[${teamId}] Error updating squad role:`, error);
        throw error;
      }

      // Update local state - ONLY for this team's hook instance
      setSquadPlayers(prev => prev.map(player => 
        player.id === playerId 
          ? { ...player, squadRole: squadRole }
          : player
      ));

      console.log(`[${teamId}] Successfully updated squad role for player ${playerId}`);
    } catch (error) {
      console.error(`[${teamId}] Error in updateSquadRole:`, error);
      throw error;
    }
  };

  useEffect(() => {
    console.log(`[${teamId}] Effect triggered - reloading data for event:`, eventId);
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
