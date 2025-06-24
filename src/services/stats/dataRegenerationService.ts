
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
      
      // Also fetch and display data in JavaScript for comparison
      const { data: selections, error: selectionsError } = await supabase
        .from('event_selections')
        .select(`
          *,
          events!inner(title, opponent, date)
        `)
        .contains('player_positions', [{ playerId }])
        .order('events.date', { ascending: false })
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
        .order('events.date', { ascending: false })
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
