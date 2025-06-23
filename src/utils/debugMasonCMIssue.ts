
import { supabase } from '@/integrations/supabase/client';

export const debugMasonCMIssue = async (): Promise<void> => {
  const masonId = 'bb4de0de-c98c-485b-85b6-b70dd67736e4';
  
  console.log('🔍 DEBUGGING MASON CM POSITION ISSUE');
  console.log('=====================================');
  
  // Step 1: Check all event_selections for Mason
  console.log('\n1️⃣ CHECKING EVENT_SELECTIONS FOR MASON:');
  const { data: selections, error: selectionsError } = await supabase
    .from('event_selections')
    .select(`
      id,
      event_id,
      team_number,
      period_number,
      formation,
      player_positions,
      events!inner(id, date, opponent, title)
    `)
    .or('events.opponent.ilike.%ferry%,events.title.ilike.%ferry%');

  if (selectionsError) {
    console.error('Error fetching selections:', selectionsError);
    return;
  }

  if (selections) {
    console.log(`Found ${selections.length} Ferry Athletic selections`);
    
    selections.forEach((selection, idx) => {
      console.log(`\n📋 Selection ${idx + 1}:`);
      console.log(`Event: ${selection.events?.title} (${selection.events?.date})`);
      console.log(`Formation: ${selection.formation}`);
      console.log(`Team/Period: ${selection.team_number}/${selection.period_number}`);
      
      const playerPositions = selection.player_positions as any[];
      console.log(`Total players in positions: ${playerPositions?.length || 0}`);
      
      // Check each position and log details
      playerPositions?.forEach((pos, posIdx) => {
        const playerId = pos.playerId || pos.player_id;
        console.log(`  Position ${posIdx + 1}: ${pos.position} - Player: ${playerId}`);
        
        if (playerId === masonId) {
          console.log(`  🎯 MASON FOUND! Position: "${pos.position}", IsSubstitute: ${pos.isSubstitute}`);
          console.log(`  🎯 Full Mason position object:`, JSON.stringify(pos, null, 4));
        }
        
        if (pos.position === 'CM') {
          console.log(`  ⚠️ CM POSITION FOUND! Player: ${playerId}`);
          console.log(`  ⚠️ Full CM position object:`, JSON.stringify(pos, null, 4));
        }
      });
    });
  }

  // Step 2: Check event_player_stats for Mason and Ferry matches
  console.log('\n2️⃣ CHECKING EVENT_PLAYER_STATS FOR MASON (FERRY MATCHES):');
  const { data: stats, error: statsError } = await supabase
    .from('event_player_stats')
    .select(`
      *,
      events!inner(id, date, opponent, title)
    `)
    .eq('player_id', masonId)
    .or('events.opponent.ilike.%ferry%,events.title.ilike.%ferry%');

  if (statsError) {
    console.error('Error fetching stats:', statsError);
  } else if (stats) {
    console.log(`Found ${stats.length} event_player_stats records for Mason in Ferry matches`);
    
    stats.forEach((stat, idx) => {
      console.log(`\n📊 Stat Record ${idx + 1}:`);
      console.log(`Event: ${stat.events?.title} (${stat.events?.date})`);
      console.log(`Position: "${stat.position}"`);
      console.log(`Minutes: ${stat.minutes_played}`);
      console.log(`Is Substitute: ${stat.is_substitute}`);
      console.log(`Team/Period: ${stat.team_number}/${stat.period_number}`);
      console.log(`Record ID: ${stat.id}`);
      
      if (stat.position === 'CM') {
        console.log(`🚨 FOUND CM POSITION IN STATS!`);
        console.log(`🚨 Full record:`, JSON.stringify(stat, null, 4));
      }
    });
  }

  // Step 3: Check Mason's current match_stats
  console.log('\n3️⃣ CHECKING MASON\'S CURRENT MATCH_STATS:');
  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('name, match_stats')
    .eq('id', masonId)
    .single();

  if (playerError) {
    console.error('Error fetching player:', playerError);
  } else if (player) {
    console.log(`Player: ${player.name}`);
    const matchStats = player.match_stats as any;
    
    if (matchStats?.minutesByPosition) {
      console.log('📈 Minutes by position in match_stats:');
      Object.entries(matchStats.minutesByPosition).forEach(([position, minutes]) => {
        console.log(`  ${position}: ${minutes} minutes`);
        if (position === 'CM') {
          console.log(`  🚨 CM MINUTES FOUND: ${minutes}`);
        }
      });
    }

    if (matchStats?.recentGames) {
      console.log('\n📅 Recent games with Ferry Athletic:');
      const ferryGames = matchStats.recentGames.filter((game: any) => 
        (game.opponent && game.opponent.toLowerCase().includes('ferry')) ||
        (game.title && game.title.toLowerCase().includes('ferry'))
      );
      
      ferryGames.forEach((game: any, idx: number) => {
        console.log(`\n  Game ${idx + 1}: ${game.opponent || game.title}`);
        console.log(`  Date: ${game.date}`);
        console.log(`  Minutes: ${game.minutes}`);
        if (game.minutesByPosition) {
          console.log(`  Positions:`, JSON.stringify(game.minutesByPosition, null, 4));
          if (game.minutesByPosition.CM) {
            console.log(`  🚨 CM FOUND IN RECENT GAME: ${game.minutesByPosition.CM} minutes`);
          }
        }
      });
    }
  }

  console.log('\n✅ MASON CM DEBUGGING COMPLETE');
  console.log('=====================================');
};
