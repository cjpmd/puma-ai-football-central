
import { supabase } from '@/integrations/supabase/client';

export const playerStatsService = {
  /**
   * Manually update a specific player's match statistics
   */
  async updatePlayerStats(playerId: string): Promise<void> {
    const { error } = await supabase.rpc('update_player_match_stats', {
      player_uuid: playerId
    });

    if (error) {
      console.error('Error updating player stats:', error);
      throw error;
    }
  },

  /**
   * Update all player stats for a specific event (useful after post-game edits)
   */
  async updateEventPlayerStats(eventId: string): Promise<void> {
    const { error } = await supabase.rpc('update_event_player_stats', {
      event_uuid: eventId
    });

    if (error) {
      console.error('Error updating event player stats:', error);
      throw error;
    }
  },

  /**
   * Update all completed events' player stats (useful for bulk updates)
   */
  async updateAllCompletedEventsStats(): Promise<void> {
    const { error } = await supabase.rpc('update_all_completed_events_stats');

    if (error) {
      console.error('Error updating all completed events stats:', error);
      throw error;
    }
  },

  /**
   * Check if an event has ended based on date and time
   */
  isEventCompleted(eventDate: string, endTime?: string): boolean {
    const today = new Date();
    const eventDateObj = new Date(eventDate);
    
    // If event date is in the past, it's completed
    if (eventDateObj.toDateString() < today.toDateString()) {
      return true;
    }
    
    // If event is today and has an end time, check if end time has passed
    if (eventDateObj.toDateString() === today.toDateString() && endTime) {
      const now = new Date();
      const [hours, minutes] = endTime.split(':').map(Number);
      const eventEndTime = new Date();
      eventEndTime.setHours(hours, minutes, 0, 0);
      
      return now > eventEndTime;
    }
    
    return false;
  }
};
