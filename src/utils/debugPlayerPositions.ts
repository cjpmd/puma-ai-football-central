
import { supabase } from '@/integrations/supabase/client';

export const debugPlayerPositions = async (playerId: string, playerName: string): Promise<void> => {
  console.log(`=== DEBUGGING POSITIONS FOR ${playerName} (${playerId}) ===`);
  
  // Check if this is Mason McPherson for Ferry Athletic debugging
  const isMason = playerId === 'bb4de0de-c98c-485b-85b6-b70dd67736e4';
  
  // Get event selections for Ferry Athletic if this is Mason
  if (isMason) {
    console.log('🎯 FERRY ATHLETIC FIXTURES IN EVENT_SELECTIONS:');
    const { data: ferrySelections, error: selectionsError } = await supabase
      .from('event_selections')
      .select(`
        *,
        events!inner(id, date, opponent, title)
      `)
      .or('events.opponent.ilike.%ferry%,events.title.ilike.%ferry%');

    if (selectionsError) {
      console.error('Error fetching Ferry selections:', selectionsError);
    } else if (ferrySelections) {
      for (const selection of ferrySelections) {
        console.log(`Event: ${selection.events?.title} (${selection.events?.date})`);
        console.log(`Team/Period: ${selection.team_number}/${selection.period_number}`);
        
        const playerPositions = selection.player_positions as any[];
        const masonInSelection = playerPositions?.find((pp: any) => 
          pp.playerId === playerId || pp.player_id === playerId
        );
        
        if (masonInSelection) {
          console.log('🎯 FOUND MASON IN FERRY SELECTION:');
          console.log(`🎯 Position: ${masonInSelection.position}`);
          console.log(`🎯 Is Substitute: ${masonInSelection.isSubstitute}`);
          console.log(`🎯 Minutes: ${masonInSelection.minutes || 'not specified'}`);
          console.log('🎯 Full data:', JSON.stringify(masonInSelection, null, 2));
        } else {
          console.log('❌ Mason NOT found in this Ferry selection');
        }
      }
    }

    console.log('\n🎯 FERRY ATHLETIC FIXTURES IN EVENT_PLAYER_STATS:');
    const { data: ferryStats, error: statsError } = await supabase
      .from('event_player_stats')
      .select(`
        *,
        events!inner(id, date, opponent, title)
      `)
      .eq('player_id', playerId)
      .or('events.opponent.ilike.%ferry%,events.title.ilike.%ferry%');

    if (statsError) {
      console.error('Error fetching Ferry stats:', statsError);
    } else if (ferryStats) {
      console.log(`Found ${ferryStats.length} Ferry Athletic entries in event_player_stats`);
      for (const stat of ferryStats) {
        console.log(`Event: ${stat.events?.title} (${stat.events?.date})`);
        console.log(`🎯 Team/Period: ${stat.team_number}/${stat.period_number}`);
        console.log(`🎯 Position in stats: ${stat.position}`);
        console.log(`🎯 Minutes in stats: ${stat.minutes_played}`);
        console.log(`🎯 Is Captain: ${stat.is_captain}`);
        console.log(`🎯 Is Substitute: ${stat.is_substitute}`);
      }
    }
  }

  // Get all event_player_stats for this player
  const { data: allStats, error: allStatsError } = await supabase
    .from('event_player_stats')
    .select(`
      *,
      events!inner(id, date, opponent, title)
    `)
    .eq('player_id', playerId)
    .order('events(date)', { ascending: false });

  if (allStatsError) {
    console.error('Error fetching all player stats:', allStatsError);
  } else if (allStats) {
    console.log(`\n📊 TOTAL EVENT_PLAYER_STATS ENTRIES: ${allStats.length}`);
    
    // Group by position to show totals
    const positionTotals: { [key: string]: { minutes: number, games: number } } = {};
    
    allStats.forEach(stat => {
      if (!stat.is_substitute && stat.position) {
        if (!positionTotals[stat.position]) {
          positionTotals[stat.position] = { minutes: 0, games: 0 };
        }
        positionTotals[stat.position].minutes += stat.minutes_played;
        positionTotals[stat.position].games += 1;
      }
    });
    
    console.log('📊 POSITION TOTALS (playing time only, excluding substitutes):');
    Object.entries(positionTotals).forEach(([position, totals]) => {
      console.log(`  ${position}: ${totals.minutes} minutes across ${totals.games} periods`);
    });
  }

  // Get current player match stats
  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('name, match_stats')
    .eq('id', playerId)
    .single();

  if (playerError) {
    console.error('Error fetching player:', playerError);
  } else if (player) {
    console.log('\n🎯 CURRENT PLAYER MATCH_STATS:');
    console.log('Player name:', player.name);
    
    const matchStats = player.match_stats as any;
    if (matchStats?.minutesByPosition) {
      console.log('🎯 Minutes by position in match_stats:', matchStats.minutesByPosition);
      if (isMason) {
        console.log('🎯 STC minutes:', matchStats.minutesByPosition.STC || 0);
        console.log('🎯 SUB minutes:', matchStats.minutesByPosition.SUB || 0);
        console.log('🎯 CM minutes:', matchStats.minutesByPosition.CM || 0);
      }
    }
    
    if (matchStats?.recentGames && isMason) {
      const ferryGame = matchStats.recentGames.find((game: any) => 
        (game.opponent && game.opponent.toLowerCase().includes('ferry')) ||
        (game.title && game.title.toLowerCase().includes('ferry'))
      );
      if (ferryGame) {
        console.log('🎯 FERRY GAME IN RECENT GAMES:');
        console.log('🎯 Opponent:', ferryGame.opponent);
        console.log('🎯 Minutes by position:', ferryGame.minutesByPosition);
        console.log('🎯 Total minutes:', ferryGame.minutes);
      }
    }
  }

  console.log(`=== END DEBUGGING FOR ${playerName} ===\n`);
};
