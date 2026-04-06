
import { logger } from '@/lib/logger';
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
  photo_url?: string;
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
      logger.log(`[${contextId}] No teamId provided`);
      setAvailablePlayers([]);
      setSquadPlayers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      logger.log(`[${contextId}] Loading team players...`);

      // If eventId is provided, only load players who were invited to the event
      let teamPlayersData;
      let playersError;
      
      if (eventId) {
        // Get invited player IDs from event_invitations
        const { data: invitations, error: invError } = await supabase
          .from('event_invitations')
          .select('player_id')
          .eq('event_id', eventId)
          .eq('invitee_type', 'player')
          .not('player_id', 'is', null);
        
        if (invError) {
          logger.error(`[${contextId}] Error loading event invitations:`, invError);
          throw invError;
        }
        
        const invitedPlayerIds = invitations?.map(inv => inv.player_id).filter(Boolean) || [];
        
        if (invitedPlayerIds.length === 0) {
          // No invitations found - check if it's an "everyone" event by checking if there are any invitations at all
          const { data: anyInvitations, error: anyInvError } = await supabase
            .from('event_invitations')
            .select('id')
            .eq('event_id', eventId)
            .limit(1);
          
          if (anyInvError) {
            logger.warn(`[${contextId}] Error checking for invitations:`, anyInvError);
          }
          
          // If no invitations exist at all, it's an "everyone" event - load all players
          if (!anyInvitations || anyInvitations.length === 0) {
            logger.log(`[${contextId}] No invitations found - loading all team players (everyone invited)`);
            const result = await supabase
              .from('players')
              .select('id, name, squad_number, type, photo_url')
              .eq('team_id', teamId)
              .eq('status', 'active')
              .order('squad_number');
            
            teamPlayersData = result.data;
            playersError = result.error;
          } else {
            // Invitations exist but none for players - no players to show
            logger.log(`[${contextId}] Event has invitations but no players invited`);
            teamPlayersData = [];
            playersError = null;
          }
        } else {
          // Load only invited players
          logger.log(`[${contextId}] Loading ${invitedPlayerIds.length} invited players`);
          const result = await supabase
            .from('players')
            .select('id, name, squad_number, type, photo_url')
            .in('id', invitedPlayerIds)
            .eq('status', 'active')
            .order('squad_number');
          
          teamPlayersData = result.data;
          playersError = result.error;
        }
      } else {
        // No eventId - load all team players
        const result = await supabase
          .from('players')
          .select('id, name, squad_number, type, photo_url')
          .eq('team_id', teamId)
          .eq('status', 'active')
          .order('squad_number');
        
        teamPlayersData = result.data;
        playersError = result.error;
      }

      if (playersError) {
        logger.error(`[${contextId}] Error loading team players:`, playersError);
        throw playersError;
      }

      if (!teamPlayersData || teamPlayersData.length === 0) {
        logger.log(`[${contextId}] No active players found for team`);
        setAvailablePlayers([]);
        setSquadPlayers([]);
        return;
      }

      // Convert to our format
      const allPlayers: AvailablePlayer[] = teamPlayersData.map(player => ({
        id: player.id,
        name: player.name,
        squadNumber: player.squad_number,
        type: (player.type === 'goalkeeper' ? 'goalkeeper' : 'outfield') as 'goalkeeper' | 'outfield',
        availabilityStatus: 'pending' as 'available' | 'unavailable' | 'pending',
        isAssignedToSquad: false,
        squadRole: 'player' as 'player' | 'captain' | 'vice_captain',
        photo_url: player.photo_url || undefined
      }));

      // Get availability data if eventId is provided
      let playersWithAvailability = allPlayers;
      if (eventId) {
        try {
          const playerIds = allPlayers.map(p => p.id);

          // Run both lookups in parallel — they are independent of each other
          const [
            { data: eventAvailability, error: availabilityError },
            { data: userPlayerRelationships, error: relationshipError },
          ] = await Promise.all([
            supabase
              .from('event_availability')
              .select('user_id, status, role')
              .eq('event_id', eventId),
            supabase
              .from('user_players')
              .select('user_id, player_id, relationship')
              .in('player_id', playerIds),
          ]);

          if (availabilityError) {
            logger.warn(`[${contextId}] Error loading event availability:`, availabilityError);
          }
          if (relationshipError) {
            logger.warn(`[${contextId}] Error loading user-player relationships:`, relationshipError);
          }

          if (!availabilityError && !relationshipError) {
            logger.log(`[${contextId}] Availability: ${eventAvailability?.length ?? 0} records, Relationships: ${userPlayerRelationships?.length ?? 0}`);

            // Build a Map<playerId, relationship[]> for O(1) lookups instead of
            // calling .filter() per player (which was O(n²))
            const relsByPlayer = new Map<string, Array<{ user_id: string; player_id: string }>>();
            userPlayerRelationships?.forEach(rel => {
              const list = relsByPlayer.get(rel.player_id) ?? [];
              list.push(rel);
              relsByPlayer.set(rel.player_id, list);
            });

            // Build a Map<userId, availabilityRecord> for O(1) lookups
            const availByUser = new Map<string, { status: string; role: string }>();
            eventAvailability?.forEach(a => {
              // Only store player-role availability; use first match per user
              if (a.role === 'player' && !availByUser.has(a.user_id)) {
                availByUser.set(a.user_id, a);
              }
            });

            playersWithAvailability = allPlayers.map(player => {
              const userRelationships = relsByPlayer.get(player.id) ?? [];
              let availabilityStatus: 'available' | 'unavailable' | 'pending' = 'pending';

              for (const rel of userRelationships) {
                const userAvail = availByUser.get(rel.user_id);
                if (userAvail) {
                  if (userAvail.status === 'available') {
                    availabilityStatus = 'available';
                    break; // available wins — no need to check further
                  } else if (userAvail.status === 'unavailable') {
                    availabilityStatus = 'unavailable';
                    // keep checking — another user linked to this player might be available
                  }
                }
              }

              return { ...player, availabilityStatus };
            });
          }
        } catch (error) {
          logger.warn(`[${contextId}] Could not load availability data:`, error);
        }
      }

      logger.log(`[${contextId}] Base players loaded - Available: ${playersWithAvailability.length}`);
      
      setAvailablePlayers(playersWithAvailability);
      setSquadPlayers([]);

    } catch (error) {
      logger.error(`[${contextId}] Error loading data:`, error);
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
      logger.log(`[${contextId}] Applying recovered squad state:`, recoveredSquadPlayers);
      
      setAvailablePlayers(prevAvailable => {
        const recoveredPlayerIds = new Set(recoveredSquadPlayers.map(p => p.id));
        return prevAvailable.filter(p => !recoveredPlayerIds.has(p.id));
      });
      
      setSquadPlayers(recoveredSquadPlayers);
      
      logger.log(`[${contextId}] Applied recovered state - Squad: ${recoveredSquadPlayers.length}`);
    }
  }, [loading, isRecovering, recoveredSquadPlayers, contextId]);

  const assignPlayerToSquad = useCallback(async (playerId: string, squadRole: 'player' | 'captain' | 'vice_captain' = 'player') => {
    if (!user || !eventId) {
      logger.error(`[${contextId}] Cannot assign player - missing user or eventId`);
      return;
    }

    try {
      logger.log(`[${contextId}] Assigning player ${playerId} to squad`);

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
        logger.error(`[${contextId}] Error checking existing assignment:`, checkError);
        throw checkError;
      }

      if (existingAssignment) {
        // Update existing assignment
        const { error: updateError } = await supabase
          .from('team_squads')
          .update({ squad_role: squadRole })
          .eq('id', existingAssignment.id);

        if (updateError) {
          logger.error(`[${contextId}] Error updating assignment:`, updateError);
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
          logger.error(`[${contextId}] Error inserting assignment:`, insertError);
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

      logger.log(`[${contextId}] Successfully assigned player ${playerId}`);
    } catch (error) {
      logger.error(`[${contextId}] Error assigning player:`, error);
      throw error;
    }
  }, [user, eventId, teamId, contextId, currentTeamIndex, availablePlayers]);

  const removePlayerFromSquad = useCallback(async (playerId: string) => {
    if (!eventId) {
      logger.error(`[${contextId}] Cannot remove player - missing eventId`);
      return;
    }

    try {
      logger.log(`[${contextId}] Removing player ${playerId} from squad`);

      // Remove from database
      const { error } = await supabase
        .from('team_squads')
        .delete()
        .eq('team_id', teamId)
        .eq('player_id', playerId)
        .eq('event_id', eventId)
        .eq('team_number', (currentTeamIndex ?? 0) + 1);

      if (error) {
        logger.error(`[${contextId}] Error removing player from squad:`, error);
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

      logger.log(`[${contextId}] Successfully removed player ${playerId}`);
    } catch (error) {
      logger.error(`[${contextId}] Error removing player:`, error);
      throw error;
    }
  }, [eventId, teamId, contextId, currentTeamIndex]);

  const updateSquadRole = useCallback(async (playerId: string, squadRole: 'player' | 'captain' | 'vice_captain') => {
    if (!eventId) return;

    try {
      logger.log(`[${contextId}] Updating squad role for player ${playerId} to ${squadRole}`);

      const { error } = await supabase
        .from('team_squads')
        .update({ squad_role: squadRole })
        .eq('team_id', teamId)
        .eq('player_id', playerId)
        .eq('event_id', eventId)
        .eq('team_number', (currentTeamIndex ?? 0) + 1);

      if (error) {
        logger.error(`[${contextId}] Error updating squad role:`, error);
        throw error;
      }

      // Update local state
      setSquadPlayers(prev => prev.map(player => 
        player.id === playerId 
          ? { ...player, squadRole: squadRole }
          : player
      ));

      logger.log(`[${contextId}] Successfully updated squad role`);
    } catch (error) {
      logger.error(`[${contextId}] Error updating squad role:`, error);
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
