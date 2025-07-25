
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

    // Get match history directly from event_selections (the authoritative source)
    // This ensures we get the exact positions as they were selected
    const { data: eventSelections, error: selectionsError } = await supabase
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
      .order('events(start_time)', { ascending: false });

    if (selectionsError) {
      console.error('Error fetching event selections:', selectionsError);
      return [];
    }

    if (!eventSelections || eventSelections.length === 0) {
      console.log('No event selections found');
      return [];
    }

    console.log(`Found ${eventSelections.length} event selections to process`);

    // Filter and process events where this player was selected
    const playerEvents = [];
    
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
        const isArbroathGame = selection.events?.opponent && 
          selection.events.opponent.toLowerCase().includes('arbroath');
          
        if (isArbroathGame) {
          console.log('🎯 FOUND ARBROATH GAME IN MATCH HISTORY:');
          console.log(`🎯 Event: ${selection.events?.title}`);
          console.log(`🎯 Player position in selection: ${playerInSelection.position}`);
          console.log(`🎯 Full player data:`, JSON.stringify(playerInSelection, null, 2));
        }

        // Calculate total minutes for this player in this event
        const minutes = playerInSelection.minutes || selection.duration_minutes || 90;
        
        // Check if player was captain
        const isCaptain = selection.captain_id === playerId;
        
        // Check if player was POTM
        const isPlayerOfTheMatch = selection.events?.player_of_match_id === playerId;
        
        // Build position data - use the actual selected position from event_selections
        const minutesByPosition = {
          [playerInSelection.position]: minutes
        };

        const eventData = {
          id: selection.event_id,
          uniqueKey: `${selection.event_id}-${selection.id}`,
          date: selection.events?.date,
          opponent: selection.events?.opponent || 'Training',
          eventType: selection.events?.event_type,
          performanceCategory: selection.performance_categories?.name,
          totalMinutes: minutes,
          minutesByPosition,
          captain: isCaptain,
          playerOfTheMatch: isPlayerOfTheMatch,
          wasSubstitute: playerInSelection.isSubstitute || false,
          teams: selection.team_number ? [selection.team_number.toString()] : [],
          periods: selection.period_number ? [selection.period_number.toString()] : []
        };

        if (isArbroathGame) {
          console.log('🎯 ARBROATH GAME EVENT DATA:');
          console.log(`🎯 Position in minutesByPosition: ${Object.keys(minutesByPosition)[0]}`);
          console.log(`🎯 Minutes: ${minutes}`);
          console.log('🎯 Full event data:', JSON.stringify(eventData, null, 2));
        }

        playerEvents.push(eventData);
      }
    }

    // Sort by date (most recent first)
    playerEvents.sort((a, b) => {
      const dateA = new Date(a.date || '1900-01-01');
      const dateB = new Date(b.date || '1900-01-01');
      return dateB.getTime() - dateA.getTime();
    });

    console.log(`✅ Found ${playerEvents.length} events for player using event_selections (authoritative source)`);
    
    // Log Arbroath data if found
    const arbroathGame = playerEvents.find(event => 
      event.opponent && event.opponent.toLowerCase().includes('arbroath')
    );
    if (arbroathGame) {
      console.log('🎯 FINAL ARBROATH GAME DATA IN MATCH HISTORY:');
      console.log(`🎯 Opponent: ${arbroathGame.opponent}`);
      console.log(`🎯 Position: ${Object.keys(arbroathGame.minutesByPosition)[0]}`);
      console.log(`🎯 Minutes: ${arbroathGame.totalMinutes}`);
    }
    
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
