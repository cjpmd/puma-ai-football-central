
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
    if (!teamId || !eventId) return;

    try {
      setLoading(true);
      console.log('Loading availability-based squad data for team:', teamId, 'event:', eventId);

      // Get all players who have set availability for this event
      const { data: availabilityData, error: availabilityError } = await supabase
        .from('event_availability')
        .select(`
          user_id,
          status,
          role
        `)
        .eq('event_id', eventId);

      if (availabilityError) {
        console.error('Error loading availability:', availabilityError);
        throw availabilityError;
      }

      console.log('Availability data:', availabilityData);

      // Get user-player connections for available users
      const userIds = availabilityData?.map(a => a.user_id) || [];
      if (userIds.length === 0) {
        setAvailablePlayers([]);
        setSquadPlayers([]);
        return;
      }

      const { data: userPlayerData, error: userPlayerError } = await supabase
        .from('user_players')
        .select(`
          user_id,
          player_id,
          players!inner(
            id,
            name,
            squad_number,
            type,
            team_id
          )
        `)
        .in('user_id', userIds)
        .eq('players.team_id', teamId);

      if (userPlayerError) {
        console.error('Error loading user-player connections:', userPlayerError);
        throw userPlayerError;
      }

      console.log('User-player connections:', userPlayerData);

      // Get current squad assignments
      const { data: squadData, error: squadError } = await supabase
        .from('team_squads')
        .select('player_id, squad_role')
        .eq('team_id', teamId)
        .eq('event_id', eventId);

      if (squadError) {
        console.error('Error loading squad assignments:', squadError);
        // Don't throw here, squad assignments might not exist yet
      }

      console.log('Current squad assignments:', squadData);

      // Combine the data
      const playerAvailabilityMap = new Map();
      availabilityData?.forEach(avail => {
        playerAvailabilityMap.set(avail.user_id, avail.status);
      });

      const squadAssignmentMap = new Map();
      squadData?.forEach(squad => {
        squadAssignmentMap.set(squad.player_id, squad.squad_role);
      });

      const playersWithAvailability: AvailablePlayer[] = userPlayerData?.map(up => {
        const availabilityStatus = playerAvailabilityMap.get(up.user_id) || 'pending';
        const isAssigned = squadAssignmentMap.has(up.players.id);
        const squadRole = squadAssignmentMap.get(up.players.id) || 'player';

        return {
          id: up.players.id,
          name: up.players.name,
          squadNumber: up.players.squad_number,
          type: up.players.type as 'goalkeeper' | 'outfield',
          availabilityStatus: availabilityStatus as 'available' | 'unavailable' | 'pending',
          isAssignedToSquad: isAssigned,
          squadRole: squadRole as 'player' | 'captain' | 'vice_captain'
        };
      }) || [];

      console.log('Players with availability:', playersWithAvailability);

      // Split into available and squad players
      const available = playersWithAvailability.filter(p => !p.isAssignedToSquad);
      const squad = playersWithAvailability.filter(p => p.isAssignedToSquad);

      setAvailablePlayers(available);
      setSquadPlayers(squad);
    } catch (error) {
      console.error('Error loading availability-based squad data:', error);
    } finally {
      setLoading(false);
    }
  };

  const assignPlayerToSquad = async (playerId: string, squadRole: 'player' | 'captain' | 'vice_captain' = 'player') => {
    if (!user || !eventId) return;

    try {
      console.log('Assigning player to squad:', { teamId, playerId, eventId, squadRole });

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

      if (error) {
        console.error('Error assigning player to squad:', error);
        throw error;
      }

      await loadAvailabilityBasedData();
    } catch (error) {
      console.error('Error in assignPlayerToSquad:', error);
      throw error;
    }
  };

  const removePlayerFromSquad = async (playerId: string) => {
    if (!eventId) return;

    try {
      console.log('Removing player from squad:', { teamId, playerId, eventId });

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

      await loadAvailabilityBasedData();
    } catch (error) {
      console.error('Error in removePlayerFromSquad:', error);
      throw error;
    }
  };

  const updateSquadRole = async (playerId: string, squadRole: 'player' | 'captain' | 'vice_captain') => {
    if (!eventId) return;

    try {
      console.log('Updating squad role:', { teamId, playerId, eventId, squadRole });

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

      await loadAvailabilityBasedData();
    } catch (error) {
      console.error('Error in updateSquadRole:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (eventId) {
      loadAvailabilityBasedData();
    }
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
