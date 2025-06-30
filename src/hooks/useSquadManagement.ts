
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SquadPlayer } from '@/types/teamSelection';

export const useSquadManagement = (teamId: string, eventId?: string) => {
  const [squadPlayers, setSquadPlayers] = useState<SquadPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const loadSquadPlayers = async () => {
    if (!teamId) return;

    try {
      setLoading(true);
      
      // If eventId is provided, get squad for specific event
      let query = supabase
        .from('team_squads')
        .select(`
          id,
          squad_role,
          availability_status,
          players!inner(
            id,
            name,
            squad_number,
            type
          )
        `)
        .eq('team_id', teamId);

      if (eventId) {
        query = query.eq('event_id', eventId);
      } else {
        query = query.is('event_id', null);
      }

      const { data: squadData, error } = await query;

      if (error) throw error;

      const formattedPlayers: SquadPlayer[] = squadData?.map(squad => ({
        id: squad.players.id,
        name: squad.players.name,
        squadNumber: squad.players.squad_number,
        type: squad.players.type as 'goalkeeper' | 'outfield',
        availabilityStatus: squad.availability_status as 'available' | 'unavailable' | 'pending' | 'maybe',
        squadRole: squad.squad_role as 'player' | 'captain' | 'vice_captain'
      })) || [];

      setSquadPlayers(formattedPlayers);
    } catch (error) {
      console.error('Error loading squad players:', error);
    } finally {
      setLoading(false);
    }
  };

  const addPlayerToSquad = async (playerId: string, squadRole: 'player' | 'captain' | 'vice_captain' = 'player') => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('team_squads')
        .insert({
          team_id: teamId,
          player_id: playerId,
          event_id: eventId || null,
          squad_role: squadRole,
          availability_status: 'pending',
          added_by: user.id
        });

      if (error) throw error;
      await loadSquadPlayers();
    } catch (error) {
      console.error('Error adding player to squad:', error);
      throw error;
    }
  };

  const removePlayerFromSquad = async (playerId: string) => {
    try {
      let query = supabase
        .from('team_squads')
        .delete()
        .eq('team_id', teamId)
        .eq('player_id', playerId);

      if (eventId) {
        query = query.eq('event_id', eventId);
      } else {
        query = query.is('event_id', null);
      }

      const { error } = await query;
      if (error) throw error;
      await loadSquadPlayers();
    } catch (error) {
      console.error('Error removing player from squad:', error);
      throw error;
    }
  };

  const updatePlayerAvailability = async (playerId: string, status: 'available' | 'unavailable' | 'pending' | 'maybe') => {
    try {
      let query = supabase
        .from('team_squads')
        .update({ availability_status: status })
        .eq('team_id', teamId)
        .eq('player_id', playerId);

      if (eventId) {
        query = query.eq('event_id', eventId);
      } else {
        query = query.is('event_id', null);
      }

      const { error } = await query;
      if (error) throw error;
      await loadSquadPlayers();
    } catch (error) {
      console.error('Error updating player availability:', error);
      throw error;
    }
  };

  useEffect(() => {
    loadSquadPlayers();
  }, [teamId, eventId]);

  return {
    squadPlayers,
    loading,
    addPlayerToSquad,
    removePlayerFromSquad,
    updatePlayerAvailability,
    reload: loadSquadPlayers
  };
};
