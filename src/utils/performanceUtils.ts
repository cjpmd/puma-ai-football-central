
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
    console.log('Fetching match history for player:', playerId);

    // Get match history by reconstructing from event_selections (authoritative data)
    // This ensures we get the correct positions as they were actually selected
    const { data: eventSelections, error: selectionsError } = await supabase
      .from('event_selections')
      .select(`
        *,
        events!inner(
          id,
          date,
          opponent,
          start_time,
          player_of_match_id,
          event_type
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

    // Filter and process events where this player was selected
    const playerEvents = [];
    
    for (const selection of eventSelections) {
      const playerPositions = selection.player_positions as any[];
      if (!Array.isArray(playerPositions)) continue;

      // Find this player in the selection
      const playerInSelection = playerPositions.find((pp: any) => 
        pp.playerId === playerId || pp.player_id === playerId
      );

      if (playerInSelection) {
        // Calculate total minutes for this player in this event
        const minutes = selection.duration_minutes || 90;
        
        // Check if player was captain
        const isCaptain = selection.captain_id === playerId;
        
        // Check if player was POTM
        const isPlayerOfTheMatch = selection.events?.player_of_match_id === playerId;
        
        // Build position data - use the actual selected position
        const minutesByPosition = {
          [playerInSelection.position]: minutes
        };

        playerEvents.push({
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
        });
      }
    }

    // Sort by date (most recent first)
    playerEvents.sort((a, b) => {
      const dateA = new Date(a.date || '1900-01-01');
      const dateB = new Date(b.date || '1900-01-01');
      return dateB.getTime() - dateA.getTime();
    });

    console.log(`Found ${playerEvents.length} events for player ${playerId} using event_selections data`);
    return playerEvents.slice(0, 20); // Limit to recent 20 events

  } catch (error) {
    console.error('Error fetching player match history:', error);
    return [];
  }
};
