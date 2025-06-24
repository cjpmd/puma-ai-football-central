
import { supabase } from '@/integrations/supabase/client';

export const comprehensiveStatsRebuild = async (): Promise<void> => {
  console.log('🔧 STARTING COMPREHENSIVE STATS REBUILD');
  console.log('=======================================');
  
  try {
    // Step 1: Clear all existing event_player_stats to start fresh
    console.log('\n1️⃣ CLEARING ALL EVENT_PLAYER_STATS:');
    const { error: clearError } = await supabase
      .from('event_player_stats')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Clear all records

    if (clearError) {
      console.error('Error clearing event_player_stats:', clearError);
      throw clearError;
    }
    console.log('✅ Cleared all event_player_stats');

    // Step 2: Use the database function to regenerate from selections
    console.log('\n2️⃣ REGENERATING EVENT_PLAYER_STATS FROM SELECTIONS:');
    const { error: regenError } = await supabase.rpc('regenerate_all_event_player_stats');
    
    if (regenError) {
      console.error('Error regenerating event_player_stats:', regenError);
      throw regenError;
    }
    console.log('✅ Regenerated event_player_stats from selections');

    // Step 3: Clear all player match_stats
    console.log('\n3️⃣ CLEARING ALL PLAYER MATCH_STATS:');
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
      throw clearStatsError;
    }
    console.log('✅ Cleared all player match_stats');

    // Step 4: Rebuild all player match statistics
    console.log('\n4️⃣ REBUILDING ALL PLAYER MATCH STATISTICS:');
    const { error: updateStatsError } = await supabase.rpc('update_all_completed_events_stats');
    
    if (updateStatsError) {
      console.error('Error updating player stats:', updateStatsError);
      throw updateStatsError;
    }
    console.log('✅ Rebuilt all player match statistics');

    // Step 5: Verification
    console.log('\n5️⃣ VERIFICATION:');
    const { data: statsCount } = await supabase
      .from('event_player_stats')
      .select('id', { count: 'exact' });
    
    console.log(`✅ Total event_player_stats records: ${statsCount?.length || 0}`);

    // Check sample player data
    const { data: samplePlayers } = await supabase
      .from('players')
      .select('id, name, match_stats')
      .limit(3);

    if (samplePlayers) {
      console.log('\n📊 SAMPLE PLAYER STATS AFTER REBUILD:');
      samplePlayers.forEach(player => {
        console.log(`${player.name}:`, player.match_stats);
      });
    }

    console.log('\n✅ COMPREHENSIVE STATS REBUILD COMPLETE');
    console.log('=======================================');
    
  } catch (error) {
    console.error('Error in comprehensive stats rebuild:', error);
    throw error;
  }
};
