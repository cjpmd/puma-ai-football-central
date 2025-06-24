
import { supabase } from '@/integrations/supabase/client';

export const diagnoseFerryAthleticData = async () => {
  console.log('🔍 FERRY ATHLETIC DATA DIAGNOSTIC');
  console.log('================================');

  try {
    // 1. Find Ferry Athletic event
    const { data: ferryEvent, error: eventError } = await supabase
      .from('events')
      .select('*')
      .ilike('opponent', '%ferry%')
      .single();

    if (eventError) {
      console.error('Error finding Ferry Athletic event:', eventError);
      return;
    }

    if (!ferryEvent) {
      console.log('❌ No Ferry Athletic event found');
      return;
    }

    console.log('📅 Ferry Athletic Event Found:');
    console.log(`Event ID: ${ferryEvent.id}`);
    console.log(`Title: ${ferryEvent.title}`);
    console.log(`Date: ${ferryEvent.date}`);
    console.log(`Opponent: ${ferryEvent.opponent}`);
    console.log('');

    // 2. Get team selections for this event
    const { data: selections, error: selectionsError } = await supabase
      .from('event_selections')
      .select('*')
      .eq('event_id', ferryEvent.id);

    if (selectionsError) {
      console.error('Error fetching selections:', selectionsError);
      return;
    }

    console.log('📋 TEAM SELECTIONS DATA:');
    console.log(`Found ${selections?.length || 0} team selections`);
    
    if (!selections || selections.length === 0) {
      console.log('❌ No team selections found for Ferry Athletic');
      return;
    }

    // Process each selection
    const allSelectedPlayers = new Map<string, any>();
    
    selections.forEach((selection, selectionIndex) => {
      console.log(`\n--- Selection ${selectionIndex + 1} ---`);
      console.log(`Team Number: ${selection.team_number}`);
      console.log(`Period Number: ${selection.period_number}`);
      console.log(`Duration: ${selection.duration_minutes} minutes`);
      console.log(`Captain ID: ${selection.captain_id}`);
      
      const playerPositions = selection.player_positions as any[];
      console.log(`Player Positions Array:`, JSON.stringify(playerPositions, null, 2));
      
      if (Array.isArray(playerPositions)) {
        playerPositions.forEach((pp, index) => {
          const playerId = pp.playerId || pp.player_id;
          const position = pp.position;
          const isSubstitute = pp.isSubstitute || false;
          const minutes = pp.minutes || selection.duration_minutes || 90;
          
          console.log(`  ${index + 1}. Player ID: ${playerId}, Position: "${position}", Substitute: ${isSubstitute}, Minutes: ${minutes}`);
          
          // Store for comparison
          const key = `${playerId}-${selection.team_number}-${selection.period_number}`;
          allSelectedPlayers.set(key, {
            playerId,
            position,
            isSubstitute,
            minutes,
            teamNumber: selection.team_number,
            periodNumber: selection.period_number,
            isCaptain: playerId === selection.captain_id
          });
        });
      }
    });

    // 3. Get player names for better readability
    const playerIds = Array.from(allSelectedPlayers.values()).map(p => p.playerId);
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, name')
      .in('id', playerIds);

    const playerNamesMap = new Map();
    players?.forEach(player => {
      playerNamesMap.set(player.id, player.name);
    });

    console.log('\n📊 COMPLETE TEAM SELECTION SUMMARY:');
    Array.from(allSelectedPlayers.values()).forEach((player, index) => {
      const playerName = playerNamesMap.get(player.playerId) || 'Unknown Player';
      console.log(`${index + 1}. ${playerName} (${player.playerId})`);
      console.log(`   Position: "${player.position}"`);
      console.log(`   Minutes: ${player.minutes}`);
      console.log(`   Substitute: ${player.isSubstitute}`);
      console.log(`   Captain: ${player.isCaptain}`);
      console.log(`   Team/Period: ${player.teamNumber}/${player.periodNumber}`);
    });

    // 4. Get event_player_stats for comparison
    const { data: eventStats, error: statsError } = await supabase
      .from('event_player_stats')
      .select('*')
      .eq('event_id', ferryEvent.id);

    console.log('\n🎯 EVENT_PLAYER_STATS DATA:');
    console.log(`Found ${eventStats?.length || 0} event player stats records`);
    
    if (eventStats && eventStats.length > 0) {
      eventStats.forEach((stat, index) => {
        const playerName = playerNamesMap.get(stat.player_id) || 'Unknown Player';
        console.log(`${index + 1}. ${playerName} (${stat.player_id})`);
        console.log(`   Position: "${stat.position}"`);
        console.log(`   Minutes: ${stat.minutes_played}`);
        console.log(`   Substitute: ${stat.is_substitute}`);
        console.log(`   Captain: ${stat.is_captain}`);
        console.log(`   Team/Period: ${stat.team_number}/${stat.period_number}`);
      });
    }

    // 5. Compare the data
    console.log('\n🔍 COMPARISON ANALYSIS:');
    
    // Check if every selected player has a corresponding stat
    Array.from(allSelectedPlayers.values()).forEach(selectedPlayer => {
      const playerName = playerNamesMap.get(selectedPlayer.playerId) || 'Unknown Player';
      const matchingStat = eventStats?.find(stat => 
        stat.player_id === selectedPlayer.playerId &&
        stat.team_number === selectedPlayer.teamNumber &&
        stat.period_number === selectedPlayer.periodNumber
      );
      
      if (!matchingStat) {
        console.log(`❌ MISSING: ${playerName} from team selection is NOT in event_player_stats`);
      } else {
        // Compare details
        const issues = [];
        if (matchingStat.position !== selectedPlayer.position) {
          issues.push(`Position mismatch: "${selectedPlayer.position}" vs "${matchingStat.position}"`);
        }
        if (matchingStat.minutes_played !== selectedPlayer.minutes) {
          issues.push(`Minutes mismatch: ${selectedPlayer.minutes} vs ${matchingStat.minutes_played}`);
        }
        if (matchingStat.is_substitute !== selectedPlayer.isSubstitute) {
          issues.push(`Substitute mismatch: ${selectedPlayer.isSubstitute} vs ${matchingStat.is_substitute}`);
        }
        if (matchingStat.is_captain !== selectedPlayer.isCaptain) {
          issues.push(`Captain mismatch: ${selectedPlayer.isCaptain} vs ${matchingStat.is_captain}`);
        }
        
        if (issues.length > 0) {
          console.log(`⚠️ DIFFERENCES for ${playerName}:`);
          issues.forEach(issue => console.log(`   - ${issue}`));
        } else {
          console.log(`✅ MATCH: ${playerName} data is consistent`);
        }
      }
    });

    // Check for extra stats not in selections
    eventStats?.forEach(stat => {
      const playerName = playerNamesMap.get(stat.player_id) || 'Unknown Player';
      const matchingSelection = Array.from(allSelectedPlayers.values()).find(selected =>
        selected.playerId === stat.player_id &&
        selected.teamNumber === stat.team_number &&
        selected.periodNumber === stat.period_number
      );
      
      if (!matchingSelection) {
        console.log(`❓ EXTRA: ${playerName} is in event_player_stats but NOT in team selections`);
      }
    });

    // 6. Check actual player match_stats
    console.log('\n📈 PLAYER MATCH_STATS SUMMARY:');
    for (const [playerId, playerName] of playerNamesMap.entries()) {
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('match_stats')
        .eq('id', playerId)
        .single();

      if (playerData?.match_stats) {
        const matchStats = playerData.match_stats as any;
        const recentGames = matchStats.recentGames || [];
        const ferryGame = recentGames.find((game: any) => 
          game.opponent && game.opponent.toLowerCase().includes('ferry')
        );

        if (ferryGame) {
          console.log(`${playerName}:`);
          console.log(`  Total Games: ${matchStats.totalGames}`);
          console.log(`  Total Minutes: ${matchStats.totalMinutes}`);
          console.log(`  Ferry Game:`, JSON.stringify(ferryGame, null, 4));
          
          if (ferryGame.minutesByPosition) {
            console.log(`  Ferry Positions:`, ferryGame.minutesByPosition);
          }
        }
      }
    }

    console.log('\n✅ DIAGNOSTIC COMPLETE');
    
  } catch (error) {
    console.error('Error in Ferry Athletic diagnostic:', error);
  }
};
