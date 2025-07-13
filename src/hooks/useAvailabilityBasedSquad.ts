
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
  
  // Use refs to prevent unnecessary re-runs and maintain stability
  const currentTeamIdRef = useRef(teamId);
  const currentEventIdRef = useRef(eventId);
  const currentTeamIndexRef = useRef(currentTeamIndex);
  const isLoadingRef = useRef(false);

  // Create a stable context identifier
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
      console.log(`[${contextId}] === STARTING DATA LOAD ===`);

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
        console.log(`[${contextId}] Checking existing squad assignments for team ${teamId}, event ${eventId}`);
        
        // Check both team_squads table AND event_selections table for comprehensive data
        const [squadResponse, selectionsResponse] = await Promise.all([
          supabase
            .from('team_squads')
            .select('player_id, squad_role')
            .eq('team_id', teamId)
            .eq('event_id', eventId),
          supabase
            .from('event_selections')
            .select('player_positions')
            .eq('team_id', teamId)
            .eq('event_id', eventId)
        ]);

        // Process team_squads data
        if (squadResponse.data && squadResponse.data.length > 0) {
          console.log(`[${contextId}] Found ${squadResponse.data.length} team_squads assignments:`, squadResponse.data);
          squadResponse.data.forEach(assignment => {
            assignedPlayerIds.add(assignment.player_id);
            playerRoles.set(assignment.player_id, assignment.squad_role || 'player');
            console.log(`[${contextId}] Player ${assignment.player_id} assigned via team_squads with role ${assignment.squad_role}`);
          });
        }

        // Also check event_selections for player assignments
        if (selectionsResponse.data && selectionsResponse.data.length > 0) {
          selectionsResponse.data.forEach(selection => {
            if (selection.player_positions && Array.isArray(selection.player_positions)) {
              (selection.player_positions as any[]).forEach(pos => {
                const playerId = pos.playerId || pos.player_id;
                if (playerId) {
                  assignedPlayerIds.add(playerId);
                  if (!playerRoles.has(playerId)) {
                    playerRoles.set(playerId, 'player');
                  }
                  console.log(`[${contextId}] Player ${playerId} found in event_selections`);
                }
              });
            }
          });
        }
      }

      console.log(`[${contextId}] Total assigned players: ${assignedPlayerIds.size}`);

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

      // 5. Split into available and squad players - maintain separate arrays
      const available = playersWithAvailability.filter(p => !p.isAssignedToSquad);
      const squad = playersWithAvailability.filter(p => p.isAssignedToSquad);

      console.log(`[${contextId}] === FINAL RESULTS ===`);
      console.log(`[${contextId}] Available players: ${available.length}`);
      console.log(`[${contextId}] Squad players: ${squad.length}`);
      console.log(`[${contextId}] Squad player details:`, squad.map(p => ({ id: p.id, name: p.name, role: p.squadRole })));

      // 6. Set state - create new arrays to ensure React sees changes
      setAvailablePlayers([...available]);
      setSquadPlayers([...squad]);

      console.log(`[${contextId}] === DATA LOAD COMPLETE ===`);

    } catch (error) {
      console.error(`[${contextId}] Error loading data:`, error);
      setAvailablePlayers([]);
      setSquadPlayers([]);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [teamId, eventId, currentTeamIndex, contextId]);

  const assignPlayerToSquad = useCallback(async (playerId: string, squadRole: 'player' | 'captain' | 'vice_captain' = 'player') => {
    if (!user || !eventId) {
      console.error(`[${contextId}] Cannot assign player - missing user or eventId`);
      return;
    }

    try {
      console.log(`[${contextId}] === ASSIGNING PLAYER TO SQUAD ===`);
      console.log(`[${contextId}] Player: ${playerId}, Role: ${squadRole}, Team: ${teamId}, Event: ${eventId}`);

      // First check if player is already assigned to THIS team for this event
      const { data: existingAssignment, error: checkError } = await supabase
        .from('team_squads')
        .select('id, squad_role')
        .eq('player_id', playerId)
        .eq('team_id', teamId)
        .eq('event_id', eventId)
        .maybeSingle();

      if (checkError) {
        console.error(`[${contextId}] Error checking existing assignment:`, checkError);
        throw checkError;
      }

      if (existingAssignment) {
        console.log(`[${contextId}] Player already assigned, updating role from ${existingAssignment.squad_role} to ${squadRole}`);
        const { error: updateError } = await supabase
          .from('team_squads')
          .update({ squad_role: squadRole })
          .eq('id', existingAssignment.id);

        if (updateError) {
          console.error(`[${contextId}] Error updating assignment:`, updateError);
          throw updateError;
        }
      } else {
        // Insert new assignment for THIS specific team and event
        console.log(`[${contextId}] Creating new squad assignment`);
        const { data: insertedData, error: insertError } = await supabase
          .from('team_squads')
          .insert({
            team_id: teamId,
            player_id: playerId,
            event_id: eventId,
            squad_role: squadRole,
            availability_status: 'available',
            added_by: user.id
          })
          .select()
          .single();

        if (insertError) {
          console.error(`[${contextId}] Error inserting squad assignment:`, insertError);
          throw insertError;
        }

        console.log(`[${contextId}] Successfully created assignment:`, insertedData);
      }

      console.log(`[${contextId}] Database operation successful, updating local state`);

      // Update local state immediately - move player from available to squad
      setAvailablePlayers(prev => {
        const playerToMove = prev.find(p => p.id === playerId);
        if (playerToMove) {
          console.log(`[${contextId}] Moving player from available to squad locally`);
          
          // Add to squad players
          setSquadPlayers(squadPrev => [...squadPrev, { 
            ...playerToMove, 
            isAssignedToSquad: true, 
            squadRole: squadRole 
          }]);
          
          // Remove from available players
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
      console.log(`[${contextId}] === REMOVING PLAYER FROM SQUAD ===`);
      console.log(`[${contextId}] Player: ${playerId}, Team: ${teamId}, Event: ${eventId}`);

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

      console.log(`[${contextId}] Database operation successful, updating local state`);

      // Update local state immediately - move player from squad to available
      setSquadPlayers(prev => {
        const playerToMove = prev.find(p => p.id === playerId);
        if (playerToMove) {
          console.log(`[${contextId}] Moving player from squad to available locally`);
          
          // Add to available players
          setAvailablePlayers(availPrev => [...availPrev, { 
            ...playerToMove, 
            isAssignedToSquad: false, 
            squadRole: 'player' 
          }]);
          
          // Remove from squad players
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

  // Only reload when key values actually change - but don't clear existing data
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
      
      // Load data for the new team context
      loadAvailabilityBasedData();
    }
  }, [teamId, eventId, currentTeamIndex, loadAvailabilityBasedData]);

  // Initial load only once
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
