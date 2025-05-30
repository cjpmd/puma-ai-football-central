
import { supabase } from '@/integrations/supabase/client';

export const eventPlayerStatsService = {
  /**
   * Create or update event_player_stats records for an event based on event_selections
   */
  async syncEventPlayerStats(eventId: string): Promise<void> {
    try {
      console.log('Syncing event player stats for event:', eventId);
      
      // Get event details
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) {
        console.error('Error fetching event:', eventError);
        throw eventError;
      }

      // Get event selections for this event
      const { data: selections, error: selectionsError } = await supabase
        .from('event_selections')
        .select('*')
        .eq('event_id', eventId);

      if (selectionsError) {
        console.error('Error fetching event selections:', selectionsError);
        throw selectionsError;
      }

      if (!selections || selections.length === 0) {
        console.log('No selections found for event');
        return;
      }

      // Delete existing event_player_stats for this event
      const { error: deleteError } = await supabase
        .from('event_player_stats')
        .delete()
        .eq('event_id', eventId);

      if (deleteError) {
        console.error('Error deleting existing stats:', deleteError);
        throw deleteError;
      }

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
            minutes_played: duration,
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
          throw insertError;
        }

        console.log(`Inserted ${statsToInsert.length} player stat records`);
      }

      // Update player match stats for all affected players
      const uniquePlayerIds = [...new Set(statsToInsert.map(stat => stat.player_id))];
      
      for (const playerId of uniquePlayerIds) {
        try {
          const { error: updateError } = await supabase.rpc('update_player_match_stats', { 
            player_uuid: playerId 
          });
          
          if (updateError) {
            console.error(`Error updating match stats for player ${playerId}:`, updateError);
          } else {
            console.log(`Updated match stats for player: ${playerId}`);
          }
        } catch (error) {
          console.error(`Error updating match stats for player ${playerId}:`, error);
        }
      }

    } catch (error) {
      console.error('Error syncing event player stats:', error);
      throw error;
    }
  },

  /**
   * Check if an event is completed and trigger stats update if needed
   */
  async checkAndUpdateCompletedEventStats(eventId: string): Promise<void> {
    try {
      const { data: event, error } = await supabase
        .from('events')
        .select('date, end_time')
        .eq('id', eventId)
        .single();

      if (error) throw error;

      const now = new Date();
      const eventDate = new Date(event.date);
      
      // Check if event is completed
      let isCompleted = false;
      
      if (eventDate < now) {
        // Event date is in the past
        isCompleted = true;
      } else if (eventDate.toDateString() === now.toDateString() && event.end_time) {
        // Event is today and has end time
        const [hours, minutes] = event.end_time.split(':').map(Number);
        const eventEndTime = new Date();
        eventEndTime.setHours(hours, minutes, 0, 0);
        
        if (now > eventEndTime) {
          isCompleted = true;
        }
      }

      if (isCompleted) {
        console.log('Event is completed, updating player stats');
        await this.syncEventPlayerStats(eventId);
      } else {
        console.log('Event is not yet completed');
      }

    } catch (error) {
      console.error('Error checking event completion:', error);
      throw error;
    }
  }
};
