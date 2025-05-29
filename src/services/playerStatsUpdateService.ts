
import { supabase } from '@/integrations/supabase/client';

export const updatePlayerStatsFromEvent = async (eventId: string) => {
  try {
    console.log('Updating player stats for event:', eventId);
    
    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError) {
      console.error('Error fetching event:', eventError);
      return;
    }

    // Get event selections for this event
    const { data: selections, error: selectionsError } = await supabase
      .from('event_selections')
      .select('*')
      .eq('event_id', eventId);

    if (selectionsError) {
      console.error('Error fetching event selections:', selectionsError);
      return;
    }

    if (!selections || selections.length === 0) {
      console.log('No selections found for event');
      return;
    }

    // Delete existing event_player_stats for this event
    await supabase
      .from('event_player_stats')
      .delete()
      .eq('event_id', eventId);

    // Create new event_player_stats entries
    const statsToInsert = [];

    for (const selection of selections) {
      const playerPositions = selection.player_positions as any[] || [];
      const captainId = selection.captain_id;
      const duration = selection.duration_minutes || 90;

      for (const playerPosition of playerPositions) {
        const playerId = playerPosition.playerId || playerPosition.player_id;
        if (!playerId) continue;

        statsToInsert.push({
          event_id: eventId,
          player_id: playerId,
          team_number: selection.team_number || 1,
          period_number: selection.period_number || 1,
          position: playerPosition.position || null,
          minutes_played: duration, // Assuming full duration for now
          is_captain: playerId === captainId,
          is_substitute: playerPosition.isSubstitute || false,
          substitution_time: playerPosition.substitution_time || null
        });
      }
    }

    if (statsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('event_player_stats')
        .insert(statsToInsert);

      if (insertError) {
        console.error('Error inserting player stats:', insertError);
        return;
      }

      console.log(`Inserted ${statsToInsert.length} player stat records`);

      // Update player match_stats using the database function
      const uniquePlayerIds = [...new Set(statsToInsert.map(stat => stat.player_id))];
      
      for (const playerId of uniquePlayerIds) {
        try {
          await supabase.rpc('update_player_match_stats', { 
            player_uuid: playerId 
          });
          console.log(`Updated match stats for player: ${playerId}`);
        } catch (error) {
          console.error(`Error updating match stats for player ${playerId}:`, error);
        }
      }
    }

  } catch (error) {
    console.error('Error updating player stats from event:', error);
  }
};
