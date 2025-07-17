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
      console.log('Loading squad players for team:', teamId, 'event:', eventId);
      
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

      if (error) {
        console.error('Error loading squad players:', error);
        throw error;
      }

      console.log('Squad data loaded:', squadData);

      const formattedPlayers: SquadPlayer[] = squadData?.map(squad => ({
        id: squad.players.id,
        name: squad.players.name,
        squadNumber: squad.players.squad_number,
        type: squad.players.type as 'goalkeeper' | 'outfield',
        availabilityStatus: squad.availability_status as 'available' | 'unavailable' | 'pending' | 'maybe',
        squadRole: squad.squad_role as 'player' | 'captain' | 'vice_captain'
      })) || [];

      console.log('Formatted players:', formattedPlayers);
      setSquadPlayers(formattedPlayers);
    } catch (error) {
      console.error('Error loading squad players:', error);
    } finally {
      setLoading(false);
    }
  };

  const addPlayerToSquad = async (playerId: string, squadRole: 'player' | 'captain' | 'vice_captain' = 'player') => {
    if (!user) {
      console.error('No user found');
      return;
    }

    try {
      console.log('Adding player to squad:', { teamId, playerId, eventId, squadRole, userId: user.id });
      
      // First check if user has permission by checking user_teams table
      const { data: userTeams, error: userTeamsError } = await supabase
        .from('user_teams')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', user.id);

      if (userTeamsError) {
        console.error('Error checking user teams:', userTeamsError);
        throw userTeamsError;
      }

      console.log('User teams data:', userTeams);

      if (!userTeams || userTeams.length === 0) {
        console.error('User is not a member of this team');
        throw new Error('You are not a member of this team');
      }

      const userRole = userTeams[0].role;
      console.log('User role:', userRole);

      if (!['manager', 'coach', 'admin', 'team_manager', 'team_coach'].includes(userRole)) {
        console.error('User does not have permission to manage squad');
        throw new Error('You do not have permission to manage the squad');
      }

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

      if (error) {
        console.error('Error inserting into team_squads:', error);
        throw error;
      }
      
      console.log('Player added successfully');
      await loadSquadPlayers();
    } catch (error) {
      console.error('Error adding player to squad:', error);
      throw error;
    }
  };

  const removePlayerFromSquad = async (playerId: string) => {
    try {
      console.log('Removing player from squad:', { teamId, playerId, eventId });
      
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
      if (error) {
        console.error('Error removing player:', error);
        throw error;
      }
      
      console.log('Player removed successfully');
      await loadSquadPlayers();
    } catch (error) {
      console.error('Error removing player from squad:', error);
      throw error;
    }
  };

  const updatePlayerAvailability = async (playerId: string, status: 'available' | 'unavailable' | 'pending' | 'maybe') => {
    try {
      console.log('Updating player availability:', { teamId, playerId, eventId, status });
      
      if (eventId) {
        // Update availability for ALL teams in this event for this player
        // This ensures consistency across all team selections
        const { error } = await supabase
          .from('team_squads')
          .update({ availability_status: status })
          .eq('player_id', playerId)
          .eq('event_id', eventId);

        if (error) {
          console.error('Error updating availability across all teams:', error);
          throw error;
        }
        
        console.log('Availability updated successfully across all teams for event');
      } else {
        // For non-event specific updates, only update the current team
        const { error } = await supabase
          .from('team_squads')
          .update({ availability_status: status })
          .eq('team_id', teamId)
          .eq('player_id', playerId)
          .is('event_id', null);

        if (error) {
          console.error('Error updating availability:', error);
          throw error;
        }
        
        console.log('Availability updated successfully for team');
      }
      
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
