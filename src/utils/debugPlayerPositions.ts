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
        console.log(`🎯 Event: ${selection.events?.title} (${selection.events?.date})`);
        console.log(`🎯 Team/Period: ${selection.team_number}/${selection.period_number}`);
        console.log(`🎯 Event ID: ${selection.events?.id}`);
        
        const playerPositions = selection.player_positions as any[];
        console.log(`🎯 FULL PLAYER_POSITIONS ARRAY:`, JSON.stringify(playerPositions, null, 2));
        
        // Check every player in this selection
        playerPositions?.forEach((pp: any, index: number) => {
          console.log(`🎯 Player ${index + 1}:`, JSON.stringify(pp, null, 2));
          
          const playerIdInPosition = pp.playerId || pp.player_id;
          if (playerIdInPosition === playerId) {
            console.log(`🎯 FOUND MASON AT INDEX ${index}:`);
            console.log(`🎯 Position: "${pp.position}"`);
            console.log(`🎯 Is Substitute: ${pp.isSubstitute}`);
            console.log(`🎯 Minutes: ${pp.minutes || 'not specified'}`);
            console.log(`🎯 Player ID: ${playerIdInPosition}`);
          } else if (pp.position === 'CM') {
            console.log(`🎯 FOUND CM POSITION for different player:`, JSON.stringify(pp, null, 2));
          }
        });
      }
    }

    // Check what's actually in event_player_stats for Ferry matches
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
      console.log(`🎯 Found ${ferryStats.length} Ferry Athletic entries in event_player_stats`);
      for (const stat of ferryStats) {
        console.log(`\n🎯 Event: ${stat.events?.title} (${stat.events?.date})`);
        console.log(`🎯 Team/Period: ${stat.team_number}/${stat.period_number}`);
        console.log(`🎯 Position in stats: "${stat.position}"`);
        console.log(`🎯 Minutes in stats: ${stat.minutes_played}`);
        console.log(`🎯 Is Captain: ${stat.is_captain}`);
        console.log(`🎯 Is Substitute: ${stat.is_substitute}`);
        console.log(`🎯 Event ID: ${stat.event_id}`);
        console.log(`🎯 Performance Category ID: ${stat.performance_category_id}`);
        console.log(`🎯 Record ID: ${stat.id}`);
      }
    }

    // Check if there are multiple event_selections for the same Ferry event
    console.log('\n🎯 CHECKING FOR DUPLICATE FERRY EVENT SELECTIONS:');
    const { data: allFerrySelections, error: allFerryError } = await supabase
      .from('event_selections')
      .select(`
        id,
        event_id,
        team_number,
        period_number,
        player_positions,
        events!inner(opponent, title, date)
      `)
      .or('events.opponent.ilike.%ferry%,events.title.ilike.%ferry%')
      .order('events.date', { ascending: false });

    if (allFerryError) {
      console.error('Error fetching all Ferry selections:', allFerryError);
    } else if (allFerrySelections) {
      const groupedByEvent = allFerrySelections.reduce((acc: any, selection: any) => {
        const eventId = selection.event_id;
        if (!acc[eventId]) {
          acc[eventId] = [];
        }
        acc[eventId].push(selection);
        return acc;
      }, {});

      Object.entries(groupedByEvent).forEach(([eventId, selections]: [string, any[]]) => {
        console.log(`🎯 Event ${eventId} (${selections[0]?.events?.title}) has ${selections.length} selections:`);
        selections.forEach((sel, idx) => {
          console.log(`🎯   Selection ${idx + 1}: Team ${sel.team_number}, Period ${sel.period_number}`);
          
          // Check if Mason is in this specific selection
          const playerPositions = sel.player_positions as any[];
          const masonInThisSelection = playerPositions?.find((pp: any) => 
            (pp.playerId === playerId || pp.player_id === playerId)
          );
          
          if (masonInThisSelection) {
            console.log(`🎯     MASON FOUND in this selection with position: "${masonInThisSelection.position}"`);
          }
        });
      });
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
    
    if (allStats.length === 0) {
      console.log('❌ NO EVENT_PLAYER_STATS FOUND - This explains why match stats are blank!');
      
      // Check if there are any event_selections for this player
      const { data: playerSelections, error: selectionError } = await supabase
        .from('event_selections')
        .select('*')
        .filter('player_positions', 'cs', `[{"playerId": "${playerId}"}]`);
        
      if (selectionError) {
        console.error('Error checking event_selections:', selectionError);
      } else {
        console.log(`Found ${playerSelections?.length || 0} event_selections containing this player`);
      }
    } else {
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
    } else {
      console.log('❌ NO minutesByPosition data in match_stats');
    }
    
    console.log('🎯 Total games:', matchStats?.totalGames || 0);
    console.log('🎯 Total minutes:', matchStats?.totalMinutes || 0);
    
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
