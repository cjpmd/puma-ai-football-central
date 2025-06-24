
import { supabase } from '@/integrations/supabase/client';

export const playerMatchStatsService = {
  /**
   * Update a specific player's match statistics using the FIXED database function
   */
  async updatePlayerStats(playerId: string): Promise<void> {
    try {
      console.log('=== UPDATING PLAYER STATS WITH FIXED FUNCTION ===');
      console.log('Player ID:', playerId);
      
      const { error } = await supabase.rpc('update_player_match_stats', {
        player_uuid: playerId
      });

      if (error) {
        console.error('Error updating player stats with FIXED function:', error);
        throw error;
      }
      
      console.log('✅ Successfully updated player stats with FIXED database function for:', playerId);
    } catch (error) {
      console.error('Error updating player stats:', error);
      throw error;
    }
  },

  /**
   * Update all player stats for a specific event using FIXED function
   */
  async updateEventPlayerStats(eventId: string): Promise<void> {
    try {
      console.log('Updating stats for all players in event with FIXED function:', eventId);
      
      const { error } = await supabase.rpc('update_event_player_stats', {
        event_uuid: eventId
      });

      if (error) {
        console.error('Error updating event player stats with FIXED function:', error);
        throw error;
      }
      
      console.log('✅ Completed updating all player stats for event with FIXED function');
    } catch (error) {
      console.error('Error updating event player stats:', error);
      throw error;
    }
  },

  /**
   * Update all completed events stats using the FIXED database function
   */
  async updateAllCompletedEventsStats(): Promise<void> {
    try {
      console.log('Starting bulk update of all completed events with FIXED database function');
      
      const { error } = await supabase.rpc('update_all_completed_events_stats');

      if (error) {
        console.error('Error updating all completed events stats with FIXED function:', error);
        throw error;
      }
      
      console.log('✅ Completed bulk update of all events with FIXED database function');
    } catch (error) {
      console.error('Error updating all completed events stats:', error);
      throw error;
    }
  }
};
