
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AvailablePlayer } from './useAvailabilityBasedSquad';

export const useSquadStateRecovery = (teamId: string, eventId: string, teamNumber?: number) => {
  const [recoveredSquadPlayers, setRecoveredSquadPlayers] = useState<AvailablePlayer[]>([]);
  const [isRecovering, setIsRecovering] = useState(true);

  useEffect(() => {
    const recoverSquadState = async () => {
      if (!teamId || !eventId) {
        setIsRecovering(false);
        return;
      }

      try {
        console.log(`[Squad Recovery] Starting for team ${teamId}, event ${eventId}, team number ${teamNumber}`);
        
        // Get existing squad assignments from team_squads table with team number filtering
        const { data: squadAssignments, error: squadError } = await supabase
          .from('team_squads')
          .select('player_id, squad_role, availability_status')
          .eq('team_id', teamId)
          .eq('event_id', eventId)
          .eq('team_number', teamNumber || 1);

        if (squadError) {
          console.error('[Squad Recovery] Error fetching squad assignments:', squadError);
          setIsRecovering(false);
          return;
        }

        if (!squadAssignments || squadAssignments.length === 0) {
          console.log('[Squad Recovery] No existing squad assignments found');
          setRecoveredSquadPlayers([]);
          setIsRecovering(false);
          return;
        }

        // Get player details for the assigned players
        const playerIds = squadAssignments.map(a => a.player_id);
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('id, name, squad_number, type')
          .in('id', playerIds)
          .eq('status', 'active');

        if (playersError) {
          console.error('[Squad Recovery] Error fetching player details:', playersError);
          setIsRecovering(false);
          return;
        }

        // Combine squad assignments with player data, preserving availability status
        const recoveredPlayers: AvailablePlayer[] = playersData.map(player => {
          const assignment = squadAssignments.find(a => a.player_id === player.id);
          return {
            id: player.id,
            name: player.name,
            squadNumber: player.squad_number,
            type: (player.type === 'goalkeeper' ? 'goalkeeper' : 'outfield') as 'goalkeeper' | 'outfield',
            availabilityStatus: (assignment?.availability_status || 'pending') as 'available' | 'unavailable' | 'pending',
            isAssignedToSquad: true,
            squadRole: (assignment?.squad_role || 'player') as 'player' | 'captain' | 'vice_captain'
          };
        }).filter(player => player.availabilityStatus !== 'unavailable'); // Remove unavailable players from squad

        console.log(`[Squad Recovery] Recovered ${recoveredPlayers.length} squad players:`, recoveredPlayers);
        setRecoveredSquadPlayers(recoveredPlayers);
        
      } catch (error) {
        console.error('[Squad Recovery] Unexpected error:', error);
      } finally {
        setIsRecovering(false);
      }
    };

    recoverSquadState();
  }, [teamId, eventId, teamNumber]);

  return { recoveredSquadPlayers, isRecovering };
};
