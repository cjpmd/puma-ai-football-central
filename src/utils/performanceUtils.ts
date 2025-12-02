
import { supabase } from '@/integrations/supabase/client';

export type PerformanceTrend = 'improving' | 'maintaining' | 'needs-work';

export const calculatePerformanceTrend = async (playerId: string): Promise<PerformanceTrend> => {
  try {
    // Get recent event player stats to calculate trend
    const { data: recentStats, error } = await supabase
      .from('event_player_stats')
      .select(`
        event_id,
        minutes_played,
        position,
        is_captain,
        performance_category_id,
        events!inner(
          date,
          player_of_match_id,
          end_time
        )
      `)
      .eq('player_id', playerId)
      .not('events.date', 'is', null)
      .order('events(date)', { ascending: false })
      .order('events(end_time)', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching recent stats:', error);
      return 'maintaining';
    }

    if (!recentStats || recentStats.length < 3) {
      return 'maintaining';
    }

    // Calculate performance indicators
    const recentGames = recentStats.slice(0, 5);
    const previousGames = recentStats.slice(5, 10);

    // Calculate average minutes per game
    const recentMinutesAvg = recentGames.reduce((sum, stat) => sum + (stat.minutes_played || 0), 0) / recentGames.length;
    const previousMinutesAvg = previousGames.length > 0 
      ? previousGames.reduce((sum, stat) => sum + (stat.minutes_played || 0), 0) / previousGames.length 
      : recentMinutesAvg;

    // Count captain appointments
    const recentCaptainGames = recentGames.filter(stat => stat.is_captain).length;
    const previousCaptainGames = previousGames.filter(stat => stat.is_captain).length;

    // Count POTM awards
    const recentPOTM = recentGames.filter(stat => stat.events?.player_of_match_id === playerId).length;
    const previousPOTM = previousGames.filter(stat => stat.events?.player_of_match_id === playerId).length;

    // Simple scoring system
    let trendScore = 0;

    // Minutes trend (30% weight)
    if (recentMinutesAvg > previousMinutesAvg * 1.1) trendScore += 30;
    else if (recentMinutesAvg < previousMinutesAvg * 0.8) trendScore -= 30;

    // Captain appointments (35% weight)
    if (recentCaptainGames > previousCaptainGames) trendScore += 35;
    else if (recentCaptainGames < previousCaptainGames) trendScore -= 15;

    // POTM awards (35% weight)
    if (recentPOTM > previousPOTM) trendScore += 35;
    else if (recentPOTM < previousPOTM) trendScore -= 20;

    // Determine trend based on score
    if (trendScore >= 25) return 'improving';
    if (trendScore <= -25) return 'needs-work';
    return 'maintaining';

  } catch (error) {
    console.error('Error calculating performance trend:', error);
    return 'maintaining';
  }
};

export const getPlayerMatchHistory = async (playerId: string) => {
  try {
    console.log('=== FETCHING MATCH HISTORY FROM AUTHORITATIVE SOURCE ===');
    console.log('Player ID:', playerId);

    // Fetch event_selections and match_events in parallel
    const [selectionsResult, matchEventsResult] = await Promise.all([
      supabase
        .from('event_selections')
        .select(`
          *,
          events!inner(
            id,
            date,
            opponent,
            title,
            start_time,
            player_of_match_id,
            event_type,
            end_time
          ),
          performance_categories(name)
        `)
        .order('events(date)', { ascending: false })
        .order('events(start_time)', { ascending: false }),
      
      supabase
        .from('match_events')
        .select('event_id, event_type, minute, period_number')
        .eq('player_id', playerId)
    ]);

    const { data: eventSelections, error: selectionsError } = selectionsResult;
    const { data: matchEvents, error: matchEventsError } = matchEventsResult;

    if (selectionsError) {
      console.error('Error fetching event selections:', selectionsError);
      return [];
    }

    if (matchEventsError) {
      console.error('Error fetching match events:', matchEventsError);
    }

    if (!eventSelections || eventSelections.length === 0) {
      console.log('No event selections found');
      return [];
    }

    console.log(`Found ${eventSelections.length} event selections to process`);
    console.log(`Found ${matchEvents?.length || 0} match events for player`);

    // Group match events by event_id for quick lookup
    const matchEventsByEventId = new Map<string, { goals: number; assists: number; saves: number; yellowCards: number; redCards: number }>();
    for (const event of matchEvents || []) {
      const stats = matchEventsByEventId.get(event.event_id) || { goals: 0, assists: 0, saves: 0, yellowCards: 0, redCards: 0 };
      if (event.event_type === 'goal') stats.goals++;
      else if (event.event_type === 'assist') stats.assists++;
      else if (event.event_type === 'save') stats.saves++;
      else if (event.event_type === 'yellow_card') stats.yellowCards++;
      else if (event.event_type === 'red_card') stats.redCards++;
      matchEventsByEventId.set(event.event_id, stats);
    }

    // Group selections by event_id to aggregate positions
    const eventMap = new Map<string, any>();
    
    for (const selection of eventSelections) {
      // Only process completed events
      if (!isEventCompleted(selection.events?.date, selection.events?.end_time)) {
        continue;
      }

      const playerPositions = selection.player_positions as any[];
      if (!Array.isArray(playerPositions)) continue;

      // Find this player in the selection
      const playerInSelection = playerPositions.find((pp: any) => 
        pp.playerId === playerId || pp.player_id === playerId
      );

      if (playerInSelection) {
        const eventId = selection.event_id;
        const minutes = playerInSelection.minutes || selection.duration_minutes || 90;
        const position = playerInSelection.position;
        
        // Check if we already have this event
        if (eventMap.has(eventId)) {
          // Add this position to the existing event
          const existingEvent = eventMap.get(eventId);
          existingEvent.minutesByPosition[position] = 
            (existingEvent.minutesByPosition[position] || 0) + minutes;
          existingEvent.totalMinutes += minutes;
          
          // Update captain/POTM flags if needed
          if (selection.captain_id === playerId) {
            existingEvent.captain = true;
          }
        } else {
          // Create new event entry with match stats
          const isCaptain = selection.captain_id === playerId;
          const isPlayerOfTheMatch = selection.events?.player_of_match_id === playerId;
          const matchStats = matchEventsByEventId.get(eventId) || { goals: 0, assists: 0, saves: 0, yellowCards: 0, redCards: 0 };
          
          eventMap.set(eventId, {
            id: eventId,
            date: selection.events?.date,
            opponent: selection.events?.opponent || 'Training',
            eventType: selection.events?.event_type,
            performanceCategory: selection.performance_categories?.name,
            totalMinutes: minutes,
            minutesByPosition: { [position]: minutes },
            captain: isCaptain,
            playerOfTheMatch: isPlayerOfTheMatch,
            wasSubstitute: playerInSelection.isSubstitute || false,
            matchStats,
          });
        }
      }
    }

    // Convert map to array and sort
    const playerEvents = Array.from(eventMap.values());
    playerEvents.sort((a, b) => {
      const dateA = new Date(a.date || '1900-01-01');
      const dateB = new Date(b.date || '1900-01-01');
      return dateB.getTime() - dateA.getTime();
    });

    console.log(`✅ Found ${playerEvents.length} unique events for player`);
    
    return playerEvents.slice(0, 20); // Limit to recent 20 events

  } catch (error) {
    console.error('Error fetching player match history:', error);
    return [];
  }
};

function isEventCompleted(eventDate: string, endTime?: string): boolean {
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
