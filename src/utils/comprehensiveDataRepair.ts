
import { supabase } from '@/integrations/supabase/client';

export const comprehensiveDataRepair = async (): Promise<void> => {
  console.log('🔧 STARTING COMPREHENSIVE DATA REPAIR');
  console.log('=====================================');
  
  try {
    // Step 1: Identify all players referenced in team selections
    console.log('\n1️⃣ IDENTIFYING ALL PLAYERS IN TEAM SELECTIONS:');
    const { data: allSelections, error: selectionsError } = await supabase
      .from('event_selections')
      .select('*');

    if (selectionsError) {
      console.error('Error fetching selections:', selectionsError);
      return;
    }

    // Extract all unique player IDs from selections
    const playerIdsInSelections = new Set<string>();
    allSelections?.forEach(selection => {
      const playerPositions = selection.player_positions as any[];
      playerPositions?.forEach(pos => {
        const playerId = pos.playerId || pos.player_id;
        if (playerId) {
          playerIdsInSelections.add(playerId);
        }
      });
    });

    console.log(`Found ${playerIdsInSelections.size} unique players in team selections`);

    // Step 2: Check which players exist in the players table
    console.log('\n2️⃣ CHECKING PLAYER RECORDS:');
    const { data: existingPlayers, error: playersError } = await supabase
      .from('players')
      .select('id, name')
      .in('id', Array.from(playerIdsInSelections));

    if (playersError) {
      console.error('Error fetching players:', playersError);
      return;
    }

    const existingPlayerIds = new Set(existingPlayers?.map(p => p.id) || []);
    const missingPlayerIds = Array.from(playerIdsInSelections).filter(id => !existingPlayerIds.has(id));

    console.log(`Found ${existingPlayers?.length || 0} existing players`);
    console.log(`Found ${missingPlayerIds.length} missing players:`);
    missingPlayerIds.forEach(id => console.log(`  - Missing player: ${id}`));

    // Step 3: Report on missing players (don't create them automatically)
    if (missingPlayerIds.length > 0) {
      console.log('\n⚠️ WARNING: Missing player records found!');
      console.log('These players are referenced in team selections but do not exist in the players table.');
      console.log('This will cause data integrity issues. Please check your player records.');
    }

    // Step 4: Clear all existing event_player_stats
    console.log('\n3️⃣ CLEARING EXISTING EVENT_PLAYER_STATS:');
    const { error: clearError } = await supabase
      .from('event_player_stats')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Clear all records

    if (clearError) {
      console.error('Error clearing event_player_stats:', clearError);
      return;
    }
    console.log('✅ Cleared all event_player_stats');

    // Step 5: Regenerate event_player_stats from selections
    console.log('\n4️⃣ REGENERATING EVENT_PLAYER_STATS:');
    const { error: regenError } = await supabase.rpc('regenerate_all_event_player_stats');
    
    if (regenError) {
      console.error('Error regenerating event_player_stats:', regenError);
      return;
    }
    console.log('✅ Regenerated event_player_stats from selections');

    // Step 6: Clear all player match_stats to start fresh
    console.log('\n5️⃣ CLEARING ALL PLAYER MATCH_STATS:');
    const { error: clearStatsError } = await supabase
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
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all players

    if (clearStatsError) {
      console.error('Error clearing match stats:', clearStatsError);
      return;
    }
    console.log('✅ Cleared all player match_stats');

    // Step 7: Regenerate all player match statistics
    console.log('\n6️⃣ REGENERATING ALL PLAYER MATCH STATISTICS:');
    const { error: updateStatsError } = await supabase.rpc('update_all_completed_events_stats');
    
    if (updateStatsError) {
      console.error('Error updating player stats:', updateStatsError);
      return;
    }
    console.log('✅ Regenerated all player match statistics');

    // Step 8: Verify the results
    console.log('\n7️⃣ VERIFICATION:');
    const { data: statsCount } = await supabase
      .from('event_player_stats')
      .select('id', { count: 'exact' });
    
    console.log(`✅ Total event_player_stats records: ${statsCount?.length || 0}`);

    // Check Mason specifically
    const masonId = 'bb4de0de-c98c-485b-85b6-b70dd67736e4';
    const { data: masonData, error: masonError } = await supabase
      .from('players')
      .select('name, match_stats')
      .eq('id', masonId)
      .maybeSingle();

    if (masonError) {
      console.log('❌ Mason McPherson: Player record not found in database');
    } else if (masonData) {
      console.log('✅ Mason McPherson: Player record exists');
      console.log(`📊 Mason's match stats:`, masonData.match_stats);
    }

    const { data: masonStats } = await supabase
      .from('event_player_stats')
      .select('*')
      .eq('player_id', masonId);
    
    console.log(`📊 Mason's event_player_stats records: ${masonStats?.length || 0}`);

    console.log('\n✅ COMPREHENSIVE DATA REPAIR COMPLETE');
    console.log('=====================================');
    
  } catch (error) {
    console.error('Error in comprehensive data repair:', error);
  }
};
