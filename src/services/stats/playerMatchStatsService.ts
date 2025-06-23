
import { supabase } from '@/integrations/supabase/client';

export const playerMatchStatsService = {
  /**
   * Update a specific player's match statistics using the improved database function
   */
  async updatePlayerStats(playerId: string): Promise<void> {
    try {
      console.log('=== UPDATING PLAYER STATS ===');
      console.log('Player ID:', playerId);
      
      const { error } = await supabase.rpc('update_player_match_stats', {
        player_uuid: playerId
      });

      if (error) {
        console.error('Error updating player stats:', error);
        throw error;
      }
      
      console.log('✅ Successfully updated player stats for:', playerId);
    } catch (error) {
      console.error('Error updating player stats:', error);
      throw error;
    }
  },

  /**
   * Update all player stats for a specific event
   */
  async updateEventPlayerStats(eventId: string): Promise<void> {
    try {
      console.log('Updating stats for all players in event:', eventId);
      
      const { error } = await supabase.rpc('update_event_player_stats', {
        event_uuid: eventId
      });

      if (error) {
        console.error('Error updating event player stats:', error);
        throw error;
      }
      
      console.log('✅ Completed updating all player stats for event');
    } catch (error) {
      console.error('Error updating event player stats:', error);
      throw error;
    }
  },

  /**
   * Update all completed events stats using the improved database function
   */
  async updateAllCompletedEventsStats(): Promise<void> {
    try {
      console.log('Starting bulk update of all completed events with improved logic');
      
      const { error } = await supabase.rpc('update_all_completed_events_stats');

      if (error) {
        console.error('Error updating all completed events stats:', error);
        throw error;
      }
      
      console.log('✅ Completed bulk update of all events with improved position tracking');
    } catch (error) {
      console.error('Error updating all completed events stats:', error);
      throw error;
    }
  }
};
