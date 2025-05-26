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
      console.log('Player stats data:', playerStats);

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
        
        console.log(`Event ${event.title || event.id}: ${event.date}, completed: ${isCompleted}, title: ${event.title}`);
        return isCompleted;
      }) || [];

      console.log('Completed stats:', completedStats.length);
      console.log('Completed stats details:', completedStats);

      // Group stats by event to get unique events and aggregate data
      const eventStatsMap = new Map();
      completedStats.forEach(stat => {
        const eventId = stat.event_id;
        if (!eventStatsMap.has(eventId)) {
          eventStatsMap.set(eventId, {
            id: eventId,
            date: stat.events.date,
            title: stat.events.title,
            opponent: stat.events.opponent || 'Training',
            playerOfTheMatch: stat.events.player_of_match_id === playerId,
            totalMinutes: 0,
            positions: [],
            wasCaptain: false,
            minutesByPosition: {}
          });
        }
        
        const eventStat = eventStatsMap.get(eventId);
        eventStat.totalMinutes += stat.minutes_played || 0;
        
        if (stat.position && stat.position !== 'SUB') {
          eventStat.positions.push(stat.position);
          eventStat.minutesByPosition[stat.position] = (eventStat.minutesByPosition[stat.position] || 0) + (stat.minutes_played || 0);
        }
        
        if (stat.is_captain) {
          eventStat.wasCaptain = true;
        }
      });

      // Calculate totals
      const uniqueEvents = Array.from(eventStatsMap.values());
      const totalGames = uniqueEvents.length;
      const totalMinutes = uniqueEvents.reduce((sum, event) => sum + event.totalMinutes, 0);
      const captainGames = uniqueEvents.filter(event => event.wasCaptain).length;
      const potmCount = uniqueEvents.filter(event => event.playerOfTheMatch).length;

      // Calculate minutes by position across all events
      const minutesByPosition: Record<string, number> = {};
      uniqueEvents.forEach(event => {
        Object.entries(event.minutesByPosition).forEach(([position, minutes]) => {
          minutesByPosition[position] = (minutesByPosition[position] || 0) + (minutes as number);
        });
      });

      // Get recent games (last 10)
      const recentGames = uniqueEvents
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10)
        .map(event => ({
          id: event.id,
          date: event.date,
          title: event.title,
          opponent: event.opponent,
          minutes: event.totalMinutes,
          minutesByPosition: event.minutesByPosition,
          captain: event.wasCaptain,
          playerOfTheMatch: event.playerOfTheMatch
        }));

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
