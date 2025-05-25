
import { supabase } from '@/integrations/supabase/client';

export const playerStatsService = {
  /**
   * Manually update a specific player's match statistics (simplified version)
   */
  async updatePlayerStats(playerId: string): Promise<void> {
    try {
      // Get all completed events for this player
      const { data: playerStats, error: statsError } = await supabase
        .from('event_player_stats')
        .select(`
          *,
          events!inner(id, date, end_time, opponent, player_of_match_id)
        `)
        .eq('player_id', playerId);

      if (statsError) throw statsError;

      // Filter for completed events only
      const completedStats = playerStats?.filter(stat => {
        const event = stat.events;
        const today = new Date();
        const eventDate = new Date(event.date);
        
        return eventDate < today || 
               (eventDate.toDateString() === today.toDateString() && 
                event.end_time && 
                new Date(`${event.date}T${event.end_time}`) < today);
      }) || [];

      // Calculate stats
      const totalGames = new Set(completedStats.map(stat => stat.event_id)).size;
      const totalMinutes = completedStats.reduce((sum, stat) => sum + (stat.minutes_played || 0), 0);
      const captainGames = new Set(
        completedStats.filter(stat => stat.is_captain).map(stat => stat.event_id)
      ).size;
      
      const potmCount = completedStats.filter(stat => 
        stat.events.player_of_match_id === playerId
      ).length;

      // Calculate minutes by position
      const minutesByPosition: Record<string, number> = {};
      completedStats.forEach(stat => {
        if (stat.position) {
          minutesByPosition[stat.position] = (minutesByPosition[stat.position] || 0) + stat.minutes_played;
        }
      });

      // Get recent games (last 10 unique events)
      const uniqueEvents = Array.from(
        new Map(completedStats.map(stat => [stat.event_id, stat])).values()
      )
      .sort((a, b) => new Date(b.events.date).getTime() - new Date(a.events.date).getTime())
      .slice(0, 10)
      .map(stat => ({
        id: stat.event_id,
        date: stat.events.date,
        opponent: stat.events.opponent,
        minutes: stat.minutes_played,
        minutesByPosition: { [stat.position || 'Unknown']: stat.minutes_played },
        captain: stat.is_captain,
        playerOfTheMatch: stat.events.player_of_match_id === playerId
      }));

      // Update player match stats
      const { error: updateError } = await supabase
        .from('players')
        .update({
          match_stats: {
            totalGames,
            totalMinutes,
            captainGames,
            playerOfTheMatchCount: potmCount,
            minutesByPosition,
            recentGames: uniqueEvents
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', playerId);

      if (updateError) throw updateError;
      
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
      const { data: playerIds, error } = await supabase
        .from('event_player_stats')
        .select('player_id')
        .eq('event_id', eventId);

      if (error) throw error;

      const uniquePlayerIds = Array.from(new Set(playerIds?.map(p => p.player_id) || []));
      
      for (const playerId of uniquePlayerIds) {
        await this.updatePlayerStats(playerId);
      }
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
      const { data: events, error } = await supabase
        .from('events')
        .select('id')
        .or(`date.lt.${new Date().toISOString().split('T')[0]},and(date.eq.${new Date().toISOString().split('T')[0]},end_time.lt.${new Date().toTimeString().split(' ')[0]})`);

      if (error) throw error;

      for (const event of events || []) {
        await this.updateEventPlayerStats(event.id);
      }
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
