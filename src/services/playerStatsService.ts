
import { supabase } from '@/integrations/supabase/client';

export const playerStatsService = {
  /**
   * Manually update a specific player's match statistics (simplified version)
   */
  async updatePlayerStats(playerId: string): Promise<void> {
    try {
      console.log('Updating stats for player:', playerId);
      
      // Get all event player stats for this player
      const { data: playerStats, error: statsError } = await supabase
        .from('event_player_stats')
        .select(`
          *,
          events!inner(id, date, end_time, opponent, player_of_match_id, title)
        `)
        .eq('player_id', playerId);

      if (statsError) {
        console.error('Error fetching player stats:', statsError);
        throw statsError;
      }

      console.log('Found player stats:', playerStats?.length || 0);

      // Filter for completed events only
      const completedStats = playerStats?.filter(stat => {
        const event = stat.events;
        const today = new Date();
        const eventDate = new Date(event.date);
        
        // Event is completed if:
        // 1. Date is in the past
        // 2. Date is today and end_time exists and has passed
        const isCompleted = eventDate < today || 
               (eventDate.toDateString() === today.toDateString() && 
                event.end_time && 
                new Date(`${event.date}T${event.end_time}`) < today);
        
        console.log(`Event ${event.title || event.id}: ${event.date}, completed: ${isCompleted}`);
        return isCompleted;
      }) || [];

      console.log('Completed stats:', completedStats.length);

      // Calculate stats
      const uniqueEventIds = new Set(completedStats.map(stat => stat.event_id));
      const totalGames = uniqueEventIds.size;
      const totalMinutes = completedStats.reduce((sum, stat) => sum + (stat.minutes_played || 0), 0);
      
      // Captain games - count unique events where player was captain
      const captainEventIds = new Set(
        completedStats.filter(stat => stat.is_captain).map(stat => stat.event_id)
      );
      const captainGames = captainEventIds.size;
      
      // POTM count
      const potmCount = completedStats.filter(stat => 
        stat.events.player_of_match_id === playerId
      ).length;

      // Calculate minutes by position
      const minutesByPosition: Record<string, number> = {};
      completedStats.forEach(stat => {
        if (stat.position && stat.position !== 'SUB') {
          minutesByPosition[stat.position] = (minutesByPosition[stat.position] || 0) + (stat.minutes_played || 0);
        }
      });

      // Get recent games (last 10 unique events)
      const eventStatsMap = new Map();
      completedStats.forEach(stat => {
        const eventId = stat.event_id;
        if (!eventStatsMap.has(eventId)) {
          eventStatsMap.set(eventId, {
            id: eventId,
            date: stat.events.date,
            opponent: stat.events.opponent || 'Training',
            title: stat.events.title,
            minutes: 0,
            minutesByPosition: {},
            captain: false,
            playerOfTheMatch: stat.events.player_of_match_id === playerId
          });
        }
        
        const eventStat = eventStatsMap.get(eventId);
        eventStat.minutes += stat.minutes_played || 0;
        if (stat.position && stat.position !== 'SUB') {
          eventStat.minutesByPosition[stat.position] = (eventStat.minutesByPosition[stat.position] || 0) + (stat.minutes_played || 0);
        }
        if (stat.is_captain) {
          eventStat.captain = true;
        }
      });

      const recentGames = Array.from(eventStatsMap.values())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);

      const statsUpdate = {
        totalGames,
        totalMinutes,
        captainGames,
        playerOfTheMatchCount: potmCount,
        minutesByPosition,
        recentGames
      };

      console.log('Updating player with stats:', statsUpdate);

      // Update player match stats
      const { error: updateError } = await supabase
        .from('players')
        .update({
          match_stats: statsUpdate,
          updated_at: new Date().toISOString()
        })
        .eq('id', playerId);

      if (updateError) {
        console.error('Error updating player:', updateError);
        throw updateError;
      }
      
      console.log('Successfully updated player stats');
    } catch (error) {
      console.error('Error updating player stats:', error);
      throw error;
    }
  },

  /**
   * Update all player stats for a specific event (useful after post-game edits)
   */
  async updateEventPlayerStats(eventId: string): Promise<void> {
    try {
      console.log('Updating stats for all players in event:', eventId);
      
      const { data: playerIds, error } = await supabase
        .from('event_player_stats')
        .select('player_id')
        .eq('event_id', eventId);

      if (error) throw error;

      const uniquePlayerIds = Array.from(new Set(playerIds?.map(p => p.player_id) || []));
      console.log('Found players to update:', uniquePlayerIds.length);
      
      for (const playerId of uniquePlayerIds) {
        await this.updatePlayerStats(playerId);
      }
      
      console.log('Completed updating all player stats for event');
    } catch (error) {
      console.error('Error updating event player stats:', error);
      throw error;
    }
  },

  /**
   * Update all completed events' player stats (useful for bulk updates)
   */
  async updateAllCompletedEventsStats(): Promise<void> {
    try {
      console.log('Starting bulk update of all completed events');
      
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];
      const currentTime = today.toTimeString().split(' ')[0];

      const { data: events, error } = await supabase
        .from('events')
        .select('id, title, date, end_time')
        .or(`date.lt.${todayString},and(date.eq.${todayString},end_time.lt.${currentTime})`);

      if (error) {
        console.error('Error fetching completed events:', error);
        throw error;
      }

      console.log('Found completed events:', events?.length || 0);

      for (const event of events || []) {
        console.log('Processing event:', event.title || event.id);
        await this.updateEventPlayerStats(event.id);
      }
      
      console.log('Completed bulk update of all events');
    } catch (error) {
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
