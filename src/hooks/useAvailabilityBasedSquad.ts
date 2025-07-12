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

      // Get current squad assignments if eventId is provided
      let squadAssignmentMap = new Map();
      if (eventId) {
        const { data: squadData, error: squadError } = await supabase
          .from('team_squads')
          .select('player_id, squad_role')
          .eq('team_id', teamId)
          .eq('event_id', eventId);

        if (!squadError && squadData) {
          console.log('Current squad assignments:', squadData);
          squadData.forEach(squad => {
            squadAssignmentMap.set(squad.player_id, squad.squad_role);
          });
        }
      }

      // Update players with squad assignment status
      const updatedPlayers = playersWithAvailability.map(player => ({
        ...player,
        isAssignedToSquad: squadAssignmentMap.has(player.id),
        squadRole: squadAssignmentMap.get(player.id) || 'player'
      }));

      console.log('Final players with availability and squad status:', updatedPlayers.length);

      // Split into available and squad players
      const available = updatedPlayers.filter(p => !p.isAssignedToSquad);
      const squad = updatedPlayers.filter(p => p.isAssignedToSquad);

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
