
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { availabilityService } from '@/services/availabilityService';
import { useSquadStateRecovery } from './useSquadStateRecovery';

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
  
  const contextId = `SQUAD-${teamId}-T${currentTeamIndex ?? 0}`;
  const { recoveredSquadPlayers, isRecovering } = useSquadStateRecovery(teamId, eventId || '', (currentTeamIndex ?? 0) + 1);

  const loadTeamPlayers = useCallback(async () => {
    if (!teamId) {
      console.log(`[${contextId}] No teamId provided`);
      setAvailablePlayers([]);
      setSquadPlayers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log(`[${contextId}] Loading team players...`);

      // Load ALL players for this team
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

      if (!teamPlayersData || teamPlayersData.length === 0) {
        console.log(`[${contextId}] No active players found for team`);
        setAvailablePlayers([]);
        setSquadPlayers([]);
        return;
      }

      // Convert to our format
      const allPlayers = teamPlayersData.map(player => ({
        id: player.id,
        name: player.name,
        squadNumber: player.squad_number,
        type: (player.type === 'goalkeeper' ? 'goalkeeper' : 'outfield') as 'goalkeeper' | 'outfield',
        availabilityStatus: 'pending' as const,
        isAssignedToSquad: false,
        squadRole: 'player' as const
      }));

      // Get availability data if eventId is provided
      let playersWithAvailability = allPlayers;
      if (eventId) {
        try {
          const availabilityData = await availabilityService.getPlayerAvailabilityFromParents(eventId, teamId);
          console.log(`[${contextId}] Loaded availability for ${availabilityData.length} players`);
          
          playersWithAvailability = allPlayers.map(player => {
            const availabilityRecord = availabilityData.find(a => a.id === player.id);
            return availabilityRecord ? { ...player, ...availabilityRecord } : player;
          });
        } catch (error) {
          console.warn(`[${contextId}] Could not load availability data:`, error);
        }
      }

      console.log(`[${contextId}] Base players loaded - Available: ${playersWithAvailability.length}`);
      
      setAvailablePlayers(playersWithAvailability);
      setSquadPlayers([]);

    } catch (error) {
      console.error(`[${contextId}] Error loading data:`, error);
      setAvailablePlayers([]);
      setSquadPlayers([]);
    } finally {
      setLoading(false);
    }
  }, [teamId, eventId, currentTeamIndex, contextId]);

  // Load players when recovery is complete
  useEffect(() => {
    if (!isRecovering) {
      loadTeamPlayers();
    }
  }, [loadTeamPlayers, isRecovering]);

  // Apply recovered squad state after players are loaded
  useEffect(() => {
    if (!loading && !isRecovering && recoveredSquadPlayers.length > 0) {
      console.log(`[${contextId}] Applying recovered squad state:`, recoveredSquadPlayers);
      
      setAvailablePlayers(prevAvailable => {
        const recoveredPlayerIds = new Set(recoveredSquadPlayers.map(p => p.id));
        return prevAvailable.filter(p => !recoveredPlayerIds.has(p.id));
      });
      
      setSquadPlayers(recoveredSquadPlayers);
      
      console.log(`[${contextId}] Applied recovered state - Squad: ${recoveredSquadPlayers.length}`);
    }
  }, [loading, isRecovering, recoveredSquadPlayers, contextId]);

  const assignPlayerToSquad = useCallback(async (playerId: string, squadRole: 'player' | 'captain' | 'vice_captain' = 'player') => {
    if (!user || !eventId) {
      console.error(`[${contextId}] Cannot assign player - missing user or eventId`);
      return;
    }

    try {
      console.log(`[${contextId}] Assigning player ${playerId} to squad`);

      // Check if already assigned
      const { data: existingAssignment, error: checkError } = await supabase
        .from('team_squads')
        .select('id, squad_role')
        .eq('player_id', playerId)
        .eq('team_id', teamId)
        .eq('event_id', eventId)
        .eq('team_number', (currentTeamIndex ?? 0) + 1)
        .maybeSingle();

      if (checkError) {
        console.error(`[${contextId}] Error checking existing assignment:`, checkError);
        throw checkError;
      }

      if (existingAssignment) {
        // Update existing assignment
        const { error: updateError } = await supabase
          .from('team_squads')
          .update({ squad_role: squadRole })
          .eq('id', existingAssignment.id);

        if (updateError) {
          console.error(`[${contextId}] Error updating assignment:`, updateError);
          throw updateError;
        }
      } else {
        // Create new assignment
        const playerToAssign = availablePlayers.find(p => p.id === playerId);
        const { error: insertError } = await supabase
          .from('team_squads')
          .insert({
            team_id: teamId,
            player_id: playerId,
            event_id: eventId,
            team_number: (currentTeamIndex ?? 0) + 1,
            squad_role: squadRole,
            availability_status: playerToAssign?.availabilityStatus || 'pending',
            added_by: user.id
          });

        if (insertError) {
          console.error(`[${contextId}] Error inserting assignment:`, insertError);
          throw insertError;
        }
      }

      // Update local state immediately
      setAvailablePlayers(prev => {
        const playerToMove = prev.find(p => p.id === playerId);
        if (playerToMove) {
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
  }, [user, eventId, teamId, contextId, currentTeamIndex, availablePlayers]);

  const removePlayerFromSquad = useCallback(async (playerId: string) => {
    if (!eventId) {
      console.error(`[${contextId}] Cannot remove player - missing eventId`);
      return;
    }

    try {
      console.log(`[${contextId}] Removing player ${playerId} from squad`);

      // Remove from database
      const { error } = await supabase
        .from('team_squads')
        .delete()
        .eq('team_id', teamId)
        .eq('player_id', playerId)
        .eq('event_id', eventId)
        .eq('team_number', (currentTeamIndex ?? 0) + 1);

      if (error) {
        console.error(`[${contextId}] Error removing player from squad:`, error);
        throw error;
      }

      // Update local state immediately
      setSquadPlayers(prev => {
        const playerToMove = prev.find(p => p.id === playerId);
        if (playerToMove) {
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
  }, [eventId, teamId, contextId, currentTeamIndex]);

  const updateSquadRole = useCallback(async (playerId: string, squadRole: 'player' | 'captain' | 'vice_captain') => {
    if (!eventId) return;

    try {
      console.log(`[${contextId}] Updating squad role for player ${playerId} to ${squadRole}`);

      const { error } = await supabase
        .from('team_squads')
        .update({ squad_role: squadRole })
        .eq('team_id', teamId)
        .eq('player_id', playerId)
        .eq('event_id', eventId)
        .eq('team_number', (currentTeamIndex ?? 0) + 1);

      if (error) {
        console.error(`[${contextId}] Error updating squad role:`, error);
        throw error;
      }

      // Update local state
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
  }, [eventId, teamId, contextId, currentTeamIndex]);

  return {
    availablePlayers,
    squadPlayers,
    loading: loading || isRecovering,
    assignPlayerToSquad,
    removePlayerFromSquad,
    updateSquadRole,
    reload: loadTeamPlayers
  };
};
