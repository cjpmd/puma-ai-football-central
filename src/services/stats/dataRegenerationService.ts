
import { supabase } from '@/integrations/supabase/client';

export const dataRegenerationService = {
  async regenerateAllPlayerStats(): Promise<void> {
    try {
      console.log('=== STARTING COMPLETE DATA REGENERATION ===');
      
      // Step 1: Use the improved database function to regenerate event_player_stats
      console.log('Step 1: Regenerating event_player_stats from event_selections...');
      const { error: regenerateError } = await supabase.rpc('regenerate_all_event_player_stats');
      
      if (regenerateError) {
        console.error('Error regenerating event_player_stats:', regenerateError);
        throw regenerateError;
      }
      
      console.log('✅ Successfully regenerated event_player_stats');

      // Step 2: Update all player match stats using the improved function
      console.log('Step 2: Updating all player match stats...');
      const { error: updateError } = await supabase.rpc('update_all_completed_events_stats');
      
      if (updateError) {
        console.error('Error updating player match stats:', updateError);
        throw updateError;
      }
      
      console.log('✅ Successfully updated all player match stats');
      
      // Step 3: Verify data was properly regenerated
      console.log('Step 3: Verifying regenerated data...');
      const { data: statsCount, error: verifyError } = await supabase
        .from('event_player_stats')
        .select('id', { count: 'exact' });
        
      if (verifyError) {
        console.error('Error verifying regenerated data:', verifyError);
      } else {
        console.log(`✅ Verification complete: ${statsCount?.length || 0} event_player_stats records created`);
      }
      
      console.log('=== COMPLETE DATA REGENERATION FINISHED ===');
    } catch (error) {
      console.error('Error regenerating player stats:', error);
      throw error;
    }
  },

  async debugAndRegenerateForPlayer(playerId: string, playerName: string): Promise<void> {
    try {
      console.log(`🎯 STARTING COMPREHENSIVE REGENERATION FOR ${playerName}`);
      
      // Debug current player positions before regeneration
      await this.debugPlayerPositions(playerId, playerName);
      
      // Use the complete regeneration service
      await this.regenerateAllPlayerStats();
      
      // Debug positions after regeneration
      console.log('🎯 POST-REGENERATION DEBUG:');
      await this.debugPlayerPositions(playerId, playerName);
      
      console.log(`🎉 REGENERATION COMPLETE FOR ${playerName}`);
    } catch (error) {
      console.error('Error in debug and regeneration:', error);
      throw error;
    }
  },

  async debugPlayerPositions(playerId: string, playerName: string): Promise<void> {
    try {
      console.log(`🔍 Debugging positions for ${playerName} (${playerId})`);
      
      const { error } = await supabase.rpc('debug_player_positions', {
        p_player_id: playerId,
        p_player_name: playerName
      });
      
      if (error) {
        console.error('Error running debug function:', error);
      }
      
      // SPECIFIC DEBUG FOR FERRY ATHLETIC MATCH
      console.log('🚢 FERRY ATHLETIC SPECIFIC DEBUG:');
      
      // Fetch Ferry Athletic selections specifically
      const { data: ferrySelections, error: ferrySelectionsError } = await supabase
        .from('event_selections')
        .select(`
          *,
          events!inner(id, title, opponent, date)
        `)
        .contains('player_positions', [{ playerId }])
        .like('events.opponent', '%Ferry%')
        .order('events(date)', { ascending: false });

      if (ferrySelectionsError) {
        console.error('Error fetching Ferry selections:', ferrySelectionsError);
      } else if (ferrySelections && ferrySelections.length > 0) {
        console.log(`🚢 Found ${ferrySelections.length} Ferry Athletic selections for ${playerName}:`);
        ferrySelections.forEach((selection, index) => {
          const event = selection.events as any;
          console.log(`  Selection ${index + 1}: ${event.title} vs ${event.opponent} (${event.date})`);
          console.log(`    Team Number: ${selection.team_number}, Period: ${selection.period_number}`);
          console.log(`    Duration Minutes: ${selection.duration_minutes}`);
          console.log(`    Performance Category ID: ${selection.performance_category_id}`);
          console.log(`    Captain ID: ${selection.captain_id}`);
          
          const playerPositions = selection.player_positions as any[];
          const playerData = playerPositions.find(p => p.playerId === playerId || p.player_id === playerId);
          
          if (playerData) {
            console.log(`    RAW Player Data:`, JSON.stringify(playerData, null, 2));
            console.log(`    Position: "${playerData.position}"`);
            console.log(`    IsSubstitute: ${playerData.isSubstitute}`);
            console.log(`    Minutes: ${playerData.minutes}`);
          } else {
            console.log(`    ❌ Player not found in selection positions`);
          }
        });
      } else {
        console.log(`❌ No Ferry Athletic selections found for ${playerName}`);
      }

      // Fetch Ferry Athletic stats specifically
      const { data: ferryStats, error: ferryStatsError } = await supabase
        .from('event_player_stats')
        .select(`
          *,
          events!inner(id, title, opponent, date)
        `)
        .eq('player_id', playerId)
        .like('events.opponent', '%Ferry%')
        .order('events(date)', { ascending: false });

      if (ferryStatsError) {
        console.error('Error fetching Ferry stats:', ferryStatsError);
      } else if (ferryStats && ferryStats.length > 0) {
        console.log(`📊 Found ${ferryStats.length} Ferry Athletic stats records for ${playerName}:`);
        ferryStats.forEach((stat, index) => {
          const event = stat.events as any;
          console.log(`  Stats ${index + 1}: ${event.title} vs ${event.opponent} (${event.date})`);
          console.log(`    Position: "${stat.position}", IsSubstitute: ${stat.is_substitute}, Minutes: ${stat.minutes_played}`);
          console.log(`    Team: ${stat.team_number}, Period: ${stat.period_number}`);
          console.log(`    Performance Category ID: ${stat.performance_category_id}`);
        });
      } else {
        console.log(`❌ No Ferry Athletic stats found for ${playerName}`);
      }

      // Also fetch and display data in JavaScript for comparison
      const { data: selections, error: selectionsError } = await supabase
        .from('event_selections')
        .select(`
          *,
          events!inner(title, opponent, date)
        `)
        .contains('player_positions', [{ playerId }])
        .order('events(date)', { ascending: false })
        .limit(3);

      if (selectionsError) {
        console.error('Error fetching selections for debug:', selectionsError);
      } else if (selections) {
        console.log(`📋 Recent selections for ${playerName}:`);
        selections.forEach(selection => {
          const event = selection.events as any;
          const playerPositions = selection.player_positions as any[];
          const playerData = playerPositions.find(p => p.playerId === playerId || p.player_id === playerId);
          
          if (playerData) {
            console.log(`  ${event.date} vs ${event.opponent}: Position="${playerData.position}", IsSubstitute=${playerData.isSubstitute}, Minutes=${playerData.minutes || selection.duration_minutes}`);
          }
        });
      }

      const { data: stats, error: statsError } = await supabase
        .from('event_player_stats')
        .select(`
          *,
          events!inner(title, opponent, date)
        `)
        .eq('player_id', playerId)
        .order('events(date)', { ascending: false })
        .limit(3);

      if (statsError) {
        console.error('Error fetching stats for debug:', statsError);
      } else if (stats) {
        console.log(`📊 Recent stats for ${playerName}:`);
        stats.forEach(stat => {
          const event = stat.events as any;
          console.log(`  ${event.date} vs ${event.opponent}: Position="${stat.position}", IsSubstitute=${stat.is_substitute}, Minutes=${stat.minutes_played}`);
        });
      }
      
    } catch (error) {
      console.error('Error debugging player positions:', error);
    }
  }
};
