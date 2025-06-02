
import { supabase } from '@/integrations/supabase/client';

export const playerStatsService = {
  /**
   * Update a specific player's match statistics using the database function
   */
  async updatePlayerStats(playerId: string): Promise<void> {
    try {
      console.log('Updating stats for player:', playerId);
      
      // First, let's check the event_player_stats for this player to debug
      const { data: playerStats, error: statsError } = await supabase
        .from('event_player_stats')
        .select(`
          *,
          events!inner(date, opponent, end_time),
          performance_categories(name)
        `)
        .eq('player_id', playerId);

      if (statsError) {
        console.error('Error fetching player stats for debugging:', statsError);
      } else {
        console.log('Current event_player_stats for player:', playerStats);
      }

      const { error } = await supabase.rpc('update_player_match_stats', {
        player_uuid: playerId
      });

      if (error) {
        console.error('Error updating player stats:', error);
        throw error;
      }
      
      console.log('Successfully updated player stats for:', playerId);
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
      
      console.log('Completed updating all player stats for event');
    } catch (error) {
      console.error('Error updating event player stats:', error);
      throw error;
    }
  },

  /**
   * Update all completed events' player stats
   */
  async updateAllCompletedEventsStats(): Promise<void> {
    try {
      console.log('Starting bulk update of all completed events');
      
      const { error } = await supabase.rpc('update_all_completed_events_stats');

      if (error) {
        console.error('Error updating all completed events stats:', error);
        throw error;
      }
      
      console.log('Completed bulk update of all events');
    } catch (error) {
      console.error('Error updating all completed events stats:', error);
      throw error;
    }
  },

  /**
   * Regenerate all player stats from scratch
   */
  async regenerateAllPlayerStats(): Promise<void> {
    try {
      console.log('Regenerating all player stats from event_player_stats');
      
      // First, clean up any events with "Unknown" opponents
      await this.cleanupUnknownOpponentEvents();
      
      // Then regenerate all stats
      const { error } = await supabase.rpc('update_all_completed_events_stats');

      if (error) {
        console.error('Error regenerating player stats:', error);
        throw error;
      }
      
      console.log('Successfully regenerated all player stats');
    } catch (error) {
      console.error('Error regenerating player stats:', error);
      throw error;
    }
  },

  /**
   * Clean up events with "Unknown" opponents
   */
  async cleanupUnknownOpponentEvents(): Promise<void> {
    try {
      console.log('Cleaning up events with unknown opponents...');
      
      // Delete event_player_stats for events with "Unknown" opponents
      const { error: deleteStatsError } = await supabase
        .from('event_player_stats')
        .delete()
        .in('event_id', 
          supabase
            .from('events')
            .select('id')
            .ilike('opponent', 'unknown')
        );

      if (deleteStatsError) {
        console.error('Error deleting stats for unknown opponents:', deleteStatsError);
      }

      // Delete event_selections for events with "Unknown" opponents
      const { error: deleteSelectionsError } = await supabase
        .from('event_selections')
        .delete()
        .in('event_id', 
          supabase
            .from('events')
            .select('id')
            .ilike('opponent', 'unknown')
        );

      if (deleteSelectionsError) {
        console.error('Error deleting selections for unknown opponents:', deleteSelectionsError);
      }

      // Delete the events themselves
      const { error: deleteEventsError } = await supabase
        .from('events')
        .delete()
        .ilike('opponent', 'unknown');

      if (deleteEventsError) {
        console.error('Error deleting unknown opponent events:', deleteEventsError);
      } else {
        console.log('Successfully cleaned up unknown opponent events');
      }

    } catch (error) {
      console.error('Error cleaning up unknown opponent events:', error);
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
