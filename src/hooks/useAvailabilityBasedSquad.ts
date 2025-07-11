
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
    if (!teamId || !eventId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Loading availability-based squad data for team:', teamId, 'event:', eventId);

      // Get players with availability from parent responses
      const playersWithAvailability = await availabilityService.getPlayerAvailabilityFromParents(eventId, teamId);
      
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

      // Create a map of squad assignments
      const squadAssignmentMap = new Map();
      squadData?.forEach(squad => {
        squadAssignmentMap.set(squad.player_id, squad.squad_role);
      });

      // Update players with squad assignment status
      const updatedPlayers = playersWithAvailability.map(player => ({
        ...player,
        isAssignedToSquad: squadAssignmentMap.has(player.id),
        squadRole: squadAssignmentMap.get(player.id) || 'player'
      }));

      console.log('Players with availability and squad status:', updatedPlayers);

      // Split into available and squad players
      const available = updatedPlayers.filter(p => !p.isAssignedToSquad);
      const squad = updatedPlayers.filter(p => p.isAssignedToSquad);

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
