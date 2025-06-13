
import { supabase } from '@/integrations/supabase/client';

export const playerStatsService = {
  /**
   * Update a specific player's match statistics using the database function
   */
  async updatePlayerStats(playerId: string): Promise<void> {
    try {
      console.log('=== DEBUGGING PLAYER STATS UPDATE ===');
      console.log('Updating stats for player:', playerId);
      
      // Debug: Check what position data exists for this player in event_player_stats
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
        console.log('=== EVENT_PLAYER_STATS DATA ===');
        console.log('Current event_player_stats for player:', playerStats);
        console.log('Position data breakdown:', 
          playerStats?.map(stat => ({
            date: stat.events?.date,
            opponent: stat.events?.opponent,
            position: stat.position,
            minutes: stat.minutes_played,
            eventId: stat.event_id,
            playerId: stat.player_id
          }))
        );
      }

      // Also check event_selections to see what was actually selected
      const { data: eventSelections, error: selectionsError } = await supabase
        .from('event_selections')
        .select(`
          *,
          events!inner(date, opponent)
        `)
        .in('event_id', playerStats?.map(s => s.event_id) || []);

      if (!selectionsError && eventSelections) {
        console.log('=== EVENT_SELECTIONS DATA ===');
        eventSelections.forEach(selection => {
          console.log(`Event ${selection.event_id} (${selection.events?.date} vs ${selection.events?.opponent}):`);
          console.log('Player positions in selection:', selection.player_positions);
          
          // Check if this player is in the selection - properly handle Json type
          const playerPositions = selection.player_positions;
          if (Array.isArray(playerPositions)) {
            const playerInSelection = playerPositions.find((pp: any) => 
              pp.playerId === playerId || pp.player_id === playerId
            );
            if (playerInSelection) {
              console.log('Player found in selection:', playerInSelection);
            } else {
              console.log('Player NOT found in this selection');
            }
          } else {
            console.log('Player positions is not an array:', typeof playerPositions);
          }
        });
      }

      // Check the players table to see current match_stats
      const { data: currentPlayer, error: playerError } = await supabase
        .from('players')
        .select('match_stats')
        .eq('id', playerId)
        .single();

      if (!playerError && currentPlayer) {
        console.log('=== CURRENT PLAYER MATCH_STATS ===');
        console.log('Current match_stats:', currentPlayer.match_stats);
        
        // Safely access minutesByPosition with proper type checking
        const matchStats = currentPlayer.match_stats;
        if (matchStats && typeof matchStats === 'object' && !Array.isArray(matchStats)) {
          const statsObj = matchStats as any;
          if (statsObj.minutesByPosition) {
            console.log('Minutes by position:', statsObj.minutesByPosition);
          }
        }
      }

      const { error } = await supabase.rpc('update_player_match_stats', {
        player_uuid: playerId
      });

      if (error) {
        console.error('Error updating player stats:', error);
        throw error;
      }
      
      // Check the updated stats
      const { data: updatedPlayer, error: updatedError } = await supabase
        .from('players')
        .select('match_stats')
        .eq('id', playerId)
        .single();

      if (!updatedError && updatedPlayer) {
        console.log('=== UPDATED PLAYER MATCH_STATS ===');
        console.log('Updated match_stats:', updatedPlayer.match_stats);
        
        // Safely access minutesByPosition with proper type checking
        const updatedMatchStats = updatedPlayer.match_stats;
        if (updatedMatchStats && typeof updatedMatchStats === 'object' && !Array.isArray(updatedMatchStats)) {
          const updatedStatsObj = updatedMatchStats as any;
          if (updatedStatsObj.minutesByPosition) {
            console.log('Updated minutes by position:', updatedStatsObj.minutesByPosition);
          }
        }
      }
      
      console.log('Successfully updated player stats for:', playerId);
      console.log('=== END DEBUGGING ===');
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

  async cleanupOrphanedPlayerStats(): Promise<void> {
    try {
      console.log('Cleaning up orphaned player stats...');
      
      // Find event_player_stats that reference non-existent events
      const { data: orphanedStats, error: orphanedError } = await supabase
        .from('event_player_stats')
        .select(`
          id,
          event_id,
          player_id,
          events!left(id)
        `)
        .is('events.id', null);

      if (orphanedError) {
        console.error('Error finding orphaned stats:', orphanedError);
        throw orphanedError;
      }

      if (orphanedStats && orphanedStats.length > 0) {
        console.log(`Found ${orphanedStats.length} orphaned player stats`);
        
        // Get unique player IDs for stats update
        const affectedPlayerIds = [...new Set(orphanedStats.map(stat => stat.player_id))];
        
        // Delete orphaned stats
        const orphanedStatIds = orphanedStats.map(stat => stat.id);
        const { error: deleteError } = await supabase
          .from('event_player_stats')
          .delete()
          .in('id', orphanedStatIds);

        if (deleteError) {
          console.error('Error deleting orphaned stats:', deleteError);
          throw deleteError;
        }

        // Update match stats for affected players
        for (const playerId of affectedPlayerIds) {
          try {
            await this.updatePlayerStats(playerId);
          } catch (error) {
            console.error(`Error updating stats for player ${playerId}:`, error);
          }
        }

        console.log('Successfully cleaned up orphaned player stats');
      } else {
        console.log('No orphaned player stats found');
      }

    } catch (error) {
      console.error('Error during orphaned stats cleanup:', error);
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
