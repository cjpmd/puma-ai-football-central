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
    console.log('=== DEBUGGING ANDREW MCDONALD POSITION ISSUE ===');
    console.log('Fetching match history for player:', playerId);
    
    // First, let's check what's in event_player_stats for this specific player
    const { data: rawPlayerStats, error: rawStatsError } = await supabase
      .from('event_player_stats')
      .select(`
        *,
        events!inner(id, date, opponent, start_time)
      `)
      .eq('player_id', playerId)
      .order('events(date)', { ascending: false });

    if (rawStatsError) {
      console.error('Error fetching raw player stats:', rawStatsError);
    } else {
      console.log('=== RAW EVENT_PLAYER_STATS DATA ===');
      rawPlayerStats?.forEach(stat => {
        console.log(`Event ${stat.event_id} (${stat.events?.date} vs ${stat.events?.opponent}):`);
        console.log(`  - Position: ${stat.position}`);
        console.log(`  - Minutes: ${stat.minutes_played}`);
        console.log(`  - Is Captain: ${stat.is_captain}`);
        console.log(`  - Is Substitute: ${stat.is_substitute}`);
      });
    }

    // Now let's check the event_selections to see what positions were actually selected
    const eventIds = rawPlayerStats?.map(stat => stat.event_id) || [];
    const { data: eventSelections, error: selectionsError } = await supabase
      .from('event_selections')
      .select(`
        *,
        events!inner(date, opponent)
      `)
      .in('event_id', eventIds);

    if (!selectionsError && eventSelections) {
      console.log('=== EVENT_SELECTIONS COMPARISON ===');
      eventSelections.forEach(selection => {
        console.log(`Event ${selection.event_id} (${selection.events?.date} vs ${selection.events?.opponent}):`);
        console.log('Full player_positions array:', JSON.stringify(selection.player_positions, null, 2));
        
        const playerPositions = selection.player_positions as any[];
        if (Array.isArray(playerPositions)) {
          const playerInSelection = playerPositions.find((pp: any) => 
            pp.playerId === playerId || pp.player_id === playerId
          );
          if (playerInSelection) {
            console.log(`  - Player found in selections with position: ${playerInSelection.position}`);
            console.log(`  - Full player data in selection:`, JSON.stringify(playerInSelection, null, 2));
          } else {
            console.log('  - Player NOT found in this selection');
          }
        }
        
        // Check captain
        if (selection.captain_id === playerId) {
          console.log(`  - Player IS captain in this selection`);
        }
      });
    }

    // Continue with the existing aggregation logic but with enhanced debugging
    const { data: playerStats, error: statsError } = await supabase
      .from('event_player_stats')
      .select(`
        event_id,
        player_id,
        position,
        minutes_played,
        is_captain,
        is_substitute,
        performance_category_id,
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

    console.log('=== AGGREGATION INPUT DATA ===');
    console.log('Player stats for aggregation:', playerStats);

    // Get performance categories
    const { data: performanceCategories, error: categoriesError } = await supabase
      .from('performance_categories')
      .select('id, name');

    if (categoriesError) {
      console.error('Error fetching performance categories:', categoriesError);
    }

    const categoryMap = new Map();
    performanceCategories?.forEach(cat => {
      categoryMap.set(cat.id, cat.name);
    });

    // Group by event and aggregate - ONLY use actual playing time and positions
    const eventGroups = playerStats?.reduce((acc, stat) => {
      const eventId = stat.event_id;
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
          rawStats: []
        };
      }

      // Store raw data for debugging
      acc[eventId].rawStats.push({
        position: stat.position,
        minutes: stat.minutes_played,
        isSubstitute: stat.is_substitute,
        isCaptain: stat.is_captain
      });

      // CRITICAL: Only aggregate actual playing time (not substitute bench time)
      // AND only if the player has a valid playing position
      if (!stat.is_substitute && stat.minutes_played > 0 && stat.position && 
          stat.position !== 'SUB' && stat.position !== 'Substitute') {
        
        console.log(`=== AGGREGATING FOR EVENT ${eventId} ===`);
        console.log(`Player: ${playerId}`);
        console.log(`Position: ${stat.position}`);
        console.log(`Minutes: ${stat.minutes_played}`);
        console.log(`Is Substitute: ${stat.is_substitute}`);
        console.log(`Is Captain: ${stat.is_captain}`);
        
        acc[eventId].totalMinutes += stat.minutes_played;
        
        if (!acc[eventId].minutesByPosition[stat.position]) {
          acc[eventId].minutesByPosition[stat.position] = 0;
        }
        acc[eventId].minutesByPosition[stat.position] += stat.minutes_played;
        
        console.log(`Updated total minutes: ${acc[eventId].totalMinutes}`);
        console.log(`Updated position minutes:`, acc[eventId].minutesByPosition);
      } else {
        console.log(`=== SKIPPING FOR EVENT ${eventId} ===`);
        console.log(`Player: ${playerId}`);
        console.log(`Position: ${stat.position}`);
        console.log(`Minutes: ${stat.minutes_played}`);
        console.log(`Is Substitute: ${stat.is_substitute}`);
        console.log(`Reason: ${stat.is_substitute ? 'Is substitute' : stat.minutes_played <= 0 ? 'No minutes' : 'Invalid position'}`);
      }

      // Set captain and substitute flags
      acc[eventId].captain = acc[eventId].captain || stat.is_captain;
      acc[eventId].wasSubstitute = acc[eventId].wasSubstitute || stat.is_substitute;

      return acc;
    }, {} as Record<string, any>) || {};

    console.log('=== FINAL AGGREGATED EVENT GROUPS ===');
    Object.values(eventGroups).forEach((event: any) => {
      console.log(`Event ${event.id} (${event.date} vs ${event.opponent}):`);
      console.log(`  - Total Minutes: ${event.totalMinutes}`);
      console.log(`  - Minutes by Position:`, event.minutesByPosition);
      console.log(`  - Captain: ${event.captain}`);
      console.log(`  - Raw stats:`, event.rawStats);
    });

    // Convert to array and format
    const matchHistory = Object.values(eventGroups).map((event, index) => ({
      ...event,
      uniqueKey: `${event.id}-${index}`,
      teams: event.teams ? Array.from(event.teams) : [],
      periods: event.periods ? Array.from(event.periods) : []
    }));

    console.log('=== FINAL MATCH HISTORY RESULT ===');
    console.log('Match history being returned:', matchHistory);
    console.log('=== END DEBUGGING ===');

    return matchHistory;

  } catch (error) {
    console.error('Error fetching player match history:', error);
    return [];
  }
};
