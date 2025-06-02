
import { supabase } from '@/integrations/supabase/client';

export const playerStatsService = {
  /**
   * Update a specific player's match statistics using the database function
   */
  async updatePlayerStats(playerId: string): Promise<void> {
    try {
      console.log('Updating stats for player:', playerId);
      
      // Debug: Check what position data exists for this player
      const { data: playerStats, error: statsError } = await supabase
        .from('event_player_stats')
        .select(`
          *,
          events!inner(date, opponent, end_time)
        `)
        .eq('player_id', playerId)
        .order('events(date)', { ascending: false });

      if (statsError) {
        console.error('Error fetching player stats for debugging:', statsError);
      } else {
        console.log('Current event_player_stats for player:', playerStats);
        console.log('Position data breakdown:', 
          playerStats.map(stat => ({
            date: stat.events?.date,
            opponent: stat.events?.opponent,
            position: stat.position,
            minutes: stat.minutes_played,
            eventId: stat.event_id
          }))
        );
      }

      // Also check event_selections to see what was actually selected
      const { data: selections, error: selectionsError } = await supabase
        .from('event_selections')
        .select(`
          *,
          events!inner(date, opponent)
        `)
        .in('event_id', playerStats?.map(s => s.event_id) || []);

      if (!selectionsError && selections) {
        console.log('Event selections for comparison:', 
          selections.map(sel => ({
            date: sel.events?.date,
            opponent: sel.events?.opponent,
            playerPositions: sel.player_positions,
            eventId: sel.event_id
          }))
        );
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

  async cleanupUnknownOpponentEvents(): Promise<void> {
    try {
      console.log('Cleaning up events with unknown opponents...');
      
      // First, get the IDs of events with "Unknown" opponents
      const { data: unknownEvents, error: fetchError } = await supabase
        .from('events')
        .select('id')
        .ilike('opponent', 'unknown');

      if (fetchError) {
        console.error('Error fetching unknown opponent events:', fetchError);
        return;
      }

      if (!unknownEvents || unknownEvents.length === 0) {
        console.log('No unknown opponent events found');
        return;
      }

      const eventIds = unknownEvents.map(event => event.id);
      console.log('Found unknown opponent events:', eventIds);

      // Delete event_player_stats for these events
      const { error: deleteStatsError } = await supabase
        .from('event_player_stats')
        .delete()
        .in('event_id', eventIds);

      if (deleteStatsError) {
        console.error('Error deleting stats for unknown opponents:', deleteStatsError);
      }

      // Delete event_selections for these events
      const { error: deleteSelectionsError } = await supabase
        .from('event_selections')
        .delete()
        .in('event_id', eventIds);

      if (deleteSelectionsError) {
        console.error('Error deleting selections for unknown opponents:', deleteSelectionsError);
      }

      // Delete the events themselves
      const { error: deleteEventsError } = await supabase
        .from('events')
        .delete()
        .in('id', eventIds);

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
