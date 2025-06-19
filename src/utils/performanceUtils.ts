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
    console.log('=== DEBUGGING MATCH HISTORY DATA SOURCE ===');
    console.log('Fetching match history for player:', playerId);
    
    // First get the player stats with event details
    const { data: playerStats, error: statsError } = await supabase
      .from('event_player_stats')
      .select(`
        *,
        events!inner(
          id,
          date,
          opponent,
          start_time,
          player_of_match_id,
          event_type
        )
      `)
      .eq('player_id', playerId)
      .not('events.date', 'is', null)
      .order('events(date)', { ascending: false })
      .order('events(start_time)', { ascending: false });

    if (statsError) throw statsError;

    console.log('Raw event_player_stats data:', playerStats);

    // Get performance categories separately to avoid join issues
    const { data: performanceCategories, error: categoriesError } = await supabase
      .from('performance_categories')
      .select('id, name');

    if (categoriesError) {
      console.error('Error fetching performance categories:', categoriesError);
    }

    // Create a map of performance category IDs to names
    const categoryMap = new Map();
    performanceCategories?.forEach(cat => {
      categoryMap.set(cat.id, cat.name);
    });

    // Group by event and aggregate positions properly
    const eventGroups = playerStats?.reduce((acc, stat) => {
      const eventId = stat.events?.id;
      if (!eventId) return acc;

      if (!acc[eventId]) {
        acc[eventId] = {
          id: eventId,
          date: stat.events?.date,
          opponent: stat.events?.opponent,
          eventType: stat.events?.event_type,
          performanceCategory: stat.performance_category_id ? categoryMap.get(stat.performance_category_id) : null,
          totalMinutes: 0,
          minutesByPosition: {},
          captain: false,
          playerOfTheMatch: stat.events?.player_of_match_id === playerId,
          wasSubstitute: false,
          teams: new Set(),
          periods: new Set(),
          rawStats: [] // Add this to track raw data
        };
      }

      // Aggregate data properly
      acc[eventId].totalMinutes += stat.minutes_played || 0;
      acc[eventId].captain = acc[eventId].captain || stat.is_captain;
      acc[eventId].wasSubstitute = acc[eventId].wasSubstitute || stat.is_substitute;
      acc[eventId].teams.add(stat.team_number);
      acc[eventId].periods.add(stat.period_number);
      acc[eventId].rawStats.push(stat); // Store raw data for debugging

      // Aggregate position minutes - ONLY if player actually played in that position
      if (stat.position && stat.minutes_played > 0 && !stat.is_substitute) {
        if (!acc[eventId].minutesByPosition[stat.position]) {
          acc[eventId].minutesByPosition[stat.position] = 0;
        }
        acc[eventId].minutesByPosition[stat.position] += stat.minutes_played;
        
        console.log(`Player ${playerId} in event ${eventId}:`);
        console.log(`  - Position: ${stat.position}`);
        console.log(`  - Minutes: ${stat.minutes_played}`);
        console.log(`  - Is Substitute: ${stat.is_substitute}`);
        console.log(`  - Raw stat:`, stat);
      } else {
        console.log(`Skipping position aggregation for player ${playerId} in event ${eventId}:`);
        console.log(`  - Position: ${stat.position}`);
        console.log(`  - Minutes: ${stat.minutes_played}`);
        console.log(`  - Is Substitute: ${stat.is_substitute}`);
      }

      return acc;
    }, {} as Record<string, any>) || {};

    console.log('Aggregated event groups:', eventGroups);

    // Convert to array and format
    const matchHistory = Object.values(eventGroups).map(event => {
      console.log(`Final match history entry for event ${event.id}:`);
      console.log(`  - Date: ${event.date}`);
      console.log(`  - Opponent: ${event.opponent}`);
      console.log(`  - Total Minutes: ${event.totalMinutes}`);
      console.log(`  - Minutes by Position:`, event.minutesByPosition);
      console.log(`  - Raw Stats:`, event.rawStats);
      
      return {
        ...event,
        teams: Array.from(event.teams),
        periods: Array.from(event.periods)
      };
    });

    console.log('=== FINAL MATCH HISTORY RESULT ===');
    console.log('Match history to be returned:', matchHistory);
    console.log('=== END DEBUGGING MATCH HISTORY ===');

    return matchHistory;

  } catch (error) {
    console.error('Error fetching player match history:', error);
    return [];
  }
};
