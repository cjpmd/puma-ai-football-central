
import { useState, useEffect, useCallback, useRef } from 'react';
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

export const useAvailabilityBasedSquad = (teamId: string, eventId?: string, currentTeamIndex?: number) => {
  const [availablePlayers, setAvailablePlayers] = useState<AvailablePlayer[]>([]);
  const [squadPlayers, setSquadPlayers] = useState<AvailablePlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  
  // Use refs to track current values and prevent unnecessary re-runs
  const currentTeamIdRef = useRef(teamId);
  const currentEventIdRef = useRef(eventId);
  const currentTeamIndexRef = useRef(currentTeamIndex);
  const isLoadingRef = useRef(false);

  // Create a unique context identifier for logging
  const contextId = `SQUAD-${teamId}-T${currentTeamIndex ?? 0}`;

  const loadAvailabilityBasedData = useCallback(async () => {
    // Prevent multiple simultaneous loads
    if (isLoadingRef.current) {
      console.log(`[${contextId}] Load already in progress, skipping`);
      return;
    }

    if (!teamId) {
      console.log(`[${contextId}] No teamId provided, clearing data`);
      setAvailablePlayers([]);
      setSquadPlayers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      isLoadingRef.current = true;
      console.log(`[${contextId}] Loading data for team ${teamId}, event ${eventId}, teamIndex ${currentTeamIndex}`);

      // 1. Load ALL players for this specific team only
      const { data: teamPlayersData, error: playersError } = await supabase
        .from('players')
        .select('id, name, squad_number, type')
        .eq('team_id', teamId)
        .eq('status', 'active')
        .order('squad_number');

      if (playersError) {
        console.error(`[${contextId}] Error loading team players:`, playersError);
        throw playersError;
      }

      console.log(`[${contextId}] Loaded ${teamPlayersData?.length || 0} team players`);

      if (!teamPlayersData || teamPlayersData.length === 0) {
        console.log(`[${contextId}] No players found for team`);
        setAvailablePlayers([]);
        setSquadPlayers([]);
        return;
      }

      // 2. Get squad assignments for THIS specific team and event combination ONLY
      let assignedPlayerIds = new Set<string>();
      let playerRoles = new Map<string, string>();

      if (eventId) {
        const { data: squadData, error: squadError } = await supabase
          .from('team_squads')
          .select('player_id, squad_role')
          .eq('team_id', teamId)
          .eq('event_id', eventId);

        if (squadError) {
          console.error(`[${contextId}] Error loading squad assignments:`, squadError);
        } else if (squadData) {
          console.log(`[${contextId}] Found ${squadData.length} squad assignments for team/event`);
          squadData.forEach(assignment => {
            assignedPlayerIds.add(assignment.player_id);
            playerRoles.set(assignment.player_id, assignment.squad_role);
          });
        }
      }

      // 3. Convert players to our format with availability info
      let playersWithAvailability = teamPlayersData.map(player => ({
        id: player.id,
        name: player.name,
        squadNumber: player.squad_number,
        type: (player.type === 'goalkeeper' ? 'goalkeeper' : 'outfield') as 'goalkeeper' | 'outfield',
        availabilityStatus: 'pending' as const,
        isAssignedToSquad: assignedPlayerIds.has(player.id),
        squadRole: (playerRoles.get(player.id) || 'player') as 'player' | 'captain' | 'vice_captain'
      }));

      // 4. Try to get availability data if eventId is provided
      if (eventId) {
        try {
          const availabilityData = await availabilityService.getPlayerAvailabilityFromParents(eventId, teamId);
          console.log(`[${contextId}] Loaded availability for ${availabilityData.length} players`);
          
          // Update availability status for players who have responses
          playersWithAvailability = playersWithAvailability.map(player => {
            const availabilityRecord = availabilityData.find(a => a.id === player.id);
            return availabilityRecord ? { ...player, ...availabilityRecord } : player;
          });
        } catch (error) {
          console.warn(`[${contextId}] Could not load availability data:`, error);
        }
      }

      // 5. Split into available and squad players - CRUCIAL: completely separate arrays
      const available = playersWithAvailability.filter(p => !p.isAssignedToSquad);
      const squad = playersWithAvailability.filter(p => p.isAssignedToSquad);

      console.log(`[${contextId}] Final split - Available: ${available.length}, Squad: ${squad.length}`);

      // 6. Set state with isolated arrays for this team
      setAvailablePlayers([...available]);
      setSquadPlayers([...squad]);

    } catch (error) {
      console.error(`[${contextId}] Error loading data:`, error);
      setAvailablePlayers([]);
      setSquadPlayers([]);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [teamId, eventId, currentTeamIndex, contextId]); // Include contextId in dependencies

  const assignPlayerToSquad = useCallback(async (playerId: string, squadRole: 'player' | 'captain' | 'vice_captain' = 'player') => {
    if (!user || !eventId) {
      console.error(`[${contextId}] Cannot assign player - missing user or eventId`);
      return;
    }

    try {
      console.log(`[${contextId}] Assigning player ${playerId} to squad for team ${teamId}, event ${eventId}`);

      // First check if player is already assigned to THIS team for this event
      const { data: existingAssignment, error: checkError } = await supabase
        .from('team_squads')
        .select('id')
        .eq('player_id', playerId)
        .eq('team_id', teamId)
        .eq('event_id', eventId)
        .maybeSingle();

      if (checkError) {
        console.error(`[${contextId}] Error checking existing assignment:`, checkError);
        throw checkError;
      }

      if (existingAssignment) {
        console.log(`[${contextId}] Player already assigned, updating role`);
        const { error: updateError } = await supabase
          .from('team_squads')
          .update({ squad_role: squadRole })
          .eq('id', existingAssignment.id);

        if (updateError) throw updateError;
      } else {
        // Insert new assignment for THIS specific team and event
        console.log(`[${contextId}] Creating new squad assignment`);
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
          console.error(`[${contextId}] Error inserting squad assignment:`, insertError);
          throw insertError;
        }
      }

      // Update local state for THIS team only
      setAvailablePlayers(prev => {
        const playerToMove = prev.find(p => p.id === playerId);
        if (playerToMove) {
          console.log(`[${contextId}] Moving player from available to squad locally`);
          
          setSquadPlayers(squadPrev => [...squadPrev, { 
            ...playerToMove, 
            isAssignedToSquad: true, 
            squadRole: squadRole 
          }]);
          
          return prev.filter(p => p.id !== playerId);
        }
        return prev;
      });

      console.log(`[${contextId}] Successfully assigned player ${playerId}`);
    } catch (error) {
      console.error(`[${contextId}] Error assigning player:`, error);
      throw error;
    }
  }, [user, eventId, teamId, contextId]);

  const removePlayerFromSquad = useCallback(async (playerId: string) => {
    if (!eventId) {
      console.error(`[${contextId}] Cannot remove player - missing eventId`);
      return;
    }

    try {
      console.log(`[${contextId}] Removing player ${playerId} from squad for team ${teamId}, event ${eventId}`);

      // Remove from database for THIS specific team and event
      const { error } = await supabase
        .from('team_squads')
        .delete()
        .eq('team_id', teamId)
        .eq('player_id', playerId)
        .eq('event_id', eventId);

      if (error) {
        console.error(`[${contextId}] Error removing player from squad:`, error);
        throw error;
      }

      // Update local state for THIS team only
      setSquadPlayers(prev => {
        const playerToMove = prev.find(p => p.id === playerId);
        if (playerToMove) {
          console.log(`[${contextId}] Moving player from squad to available locally`);
          
          setAvailablePlayers(availPrev => [...availPrev, { 
            ...playerToMove, 
            isAssignedToSquad: false, 
            squadRole: 'player' 
          }]);
          
          return prev.filter(p => p.id !== playerId);
        }
        return prev;
      });

      console.log(`[${contextId}] Successfully removed player ${playerId}`);
    } catch (error) {
      console.error(`[${contextId}] Error removing player:`, error);
      throw error;
    }
  }, [eventId, teamId, contextId]);

  const updateSquadRole = useCallback(async (playerId: string, squadRole: 'player' | 'captain' | 'vice_captain') => {
    if (!eventId) return;

    try {
      console.log(`[${contextId}] Updating squad role for player ${playerId} to ${squadRole}`);

      const { error } = await supabase
        .from('team_squads')
        .update({ squad_role: squadRole })
        .eq('team_id', teamId)
        .eq('player_id', playerId)
        .eq('event_id', eventId);

      if (error) {
        console.error(`[${contextId}] Error updating squad role:`, error);
        throw error;
      }

      // Update local state for THIS team only
      setSquadPlayers(prev => prev.map(player => 
        player.id === playerId 
          ? { ...player, squadRole: squadRole }
          : player
      ));

      console.log(`[${contextId}] Successfully updated squad role`);
    } catch (error) {
      console.error(`[${contextId}] Error updating squad role:`, error);
      throw error;
    }
  }, [eventId, teamId, contextId]);

  // Only reload when key values actually change
  useEffect(() => {
    const teamChanged = currentTeamIdRef.current !== teamId;
    const eventChanged = currentEventIdRef.current !== eventId;
    const indexChanged = currentTeamIndexRef.current !== currentTeamIndex;

    if (teamChanged || eventChanged || indexChanged) {
      console.log(`[${contextId}] Key values changed - reloading data`);
      console.log(`[${contextId}] Team changed: ${teamChanged}, Event changed: ${eventChanged}, Index changed: ${indexChanged}`);
      
      // Update refs
      currentTeamIdRef.current = teamId;
      currentEventIdRef.current = eventId;
      currentTeamIndexRef.current = currentTeamIndex;
      
      loadAvailabilityBasedData();
    }
  }, [teamId, eventId, currentTeamIndex, loadAvailabilityBasedData]);

  // Initial load
  useEffect(() => {
    console.log(`[${contextId}] Hook initialized - performing initial load`);
    loadAvailabilityBasedData();
  }, []); // Only run on mount

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
