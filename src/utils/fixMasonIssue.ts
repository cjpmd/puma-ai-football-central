
import { supabase } from '@/integrations/supabase/client';

export const fixMasonIssue = async (): Promise<void> => {
  const masonId = 'bb4de0de-c98c-485b-85b6-b70dd67736e4';
  
  console.log('🔧 COMPREHENSIVE MASON ISSUE FIX');
  console.log('================================');
  
  // Step 1: Check if Mason exists in players table
  console.log('\n1️⃣ CHECKING MASON\'S EXISTENCE IN PLAYERS TABLE:');
  const { data: masonPlayer, error: masonError } = await supabase
    .from('players')
    .select('*')
    .eq('id', masonId);

  if (masonError) {
    console.error('Error checking Mason:', masonError);
    return;
  }

  if (!masonPlayer || masonPlayer.length === 0) {
    console.log('❌ MASON NOT FOUND IN PLAYERS TABLE!');
    console.log('This explains why stats show as blank - the player record is missing');
    return;
  } else {
    console.log('✅ Mason found in players table:', masonPlayer[0].name);
    console.log('📊 Current match_stats:', masonPlayer[0].match_stats);
  }

  // Step 2: Check all players to see if there's a name match
  console.log('\n2️⃣ SEARCHING FOR MASON BY NAME:');
  const { data: allPlayers, error: playersError } = await supabase
    .from('players')
    .select('id, name, match_stats')
    .ilike('name', '%mason%');

  if (playersError) {
    console.error('Error fetching players:', playersError);
  } else if (allPlayers) {
    console.log(`Found ${allPlayers.length} players with "mason" in name:`);
    allPlayers.forEach(player => {
      console.log(`  ${player.name} (${player.id})`);
      if (player.id !== masonId) {
        console.log(`  ⚠️ DIFFERENT ID! This might be the real Mason`);
        console.log(`  📊 Match stats:`, player.match_stats);
      }
    });
  }

  // Step 3: Check event_player_stats for any records with Mason's ID
  console.log('\n3️⃣ CHECKING EVENT_PLAYER_STATS FOR MASON\'S ID:');
  const { data: masonStats, error: statsError } = await supabase
    .from('event_player_stats')
    .select('*')
    .eq('player_id', masonId);

  if (statsError) {
    console.error('Error fetching Mason stats:', statsError);
  } else {
    console.log(`Found ${masonStats?.length || 0} event_player_stats records for Mason's ID`);
    if (masonStats && masonStats.length > 0) {
      masonStats.forEach((stat, idx) => {
        console.log(`  Record ${idx + 1}: Event ${stat.event_id}, Position: ${stat.position}, Minutes: ${stat.minutes_played}`);
      });
    }
  }

  // Step 4: Check if Mason's ID appears in any event_selections
  console.log('\n4️⃣ CHECKING EVENT_SELECTIONS FOR MASON\'S ID:');
  const { data: allSelections, error: selectionsError } = await supabase
    .from('event_selections')
    .select('*');

  if (selectionsError) {
    console.error('Error fetching selections:', selectionsError);
  } else if (allSelections) {
    let foundMason = false;
    
    allSelections.forEach(selection => {
      const playerPositions = selection.player_positions as any[];
      
      playerPositions?.forEach(pos => {
        const playerId = pos.playerId || pos.player_id;
        if (playerId === masonId) {
          foundMason = true;
          console.log(`✅ FOUND MASON in event ${selection.event_id}:`);
          console.log(`  Position: ${pos.position}`);
          console.log(`  Team/Period: ${selection.team_number}/${selection.period_number}`);
        }
      });
      
      // Also check substitutes arrays
      if (Array.isArray(selection.substitutes)) {
        if (selection.substitutes.includes(masonId)) {
          foundMason = true;
          console.log(`✅ FOUND MASON as substitute in event ${selection.event_id}`);
        }
      }
      
      if (Array.isArray(selection.substitute_players)) {
        if (selection.substitute_players.includes(masonId)) {
          foundMason = true;
          console.log(`✅ FOUND MASON as substitute player in event ${selection.event_id}`);
        }
      }
    });
    
    if (!foundMason) {
      console.log('❌ MASON NOT FOUND IN ANY EVENT_SELECTIONS');
    }
  }

  // Step 5: Clear Mason's match_stats if they contain invalid data
  console.log('\n5️⃣ CLEARING MASON\'S MATCH_STATS:');
  const { error: updateError } = await supabase
    .from('players')
    .update({ 
      match_stats: {
        totalGames: 0,
        totalMinutes: 0,
        captainGames: 0,
        playerOfTheMatchCount: 0,
        minutesByPosition: {},
        performanceCategoryStats: {},
        recentGames: []
      }
    })
    .eq('id', masonId);

  if (updateError) {
    console.error('Error updating Mason stats:', updateError);
  } else {
    console.log('✅ Mason\'s match_stats cleared successfully');
  }

  // Step 6: Regenerate stats to ensure consistency
  console.log('\n6️⃣ REGENERATING STATS:');
  try {
    const { error: regenError } = await supabase.rpc('update_player_match_stats', {
      player_uuid: masonId
    });
    
    if (regenError) {
      console.error('Error regenerating Mason stats:', regenError);
    } else {
      console.log('✅ Stats regeneration completed');
    }
  } catch (error) {
    console.error('Error in stats regeneration:', error);
  }

  console.log('\n✅ MASON ISSUE FIX COMPLETE');
  console.log('================================');
};
