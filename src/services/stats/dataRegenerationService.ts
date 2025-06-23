
import { supabase } from '@/integrations/supabase/client';
import { debugPlayerPositions } from '@/utils/debugPlayerPositions';

export const dataRegenerationService = {
  async regenerateAllPlayerStats(): Promise<void> {
    try {
      console.log('=== STARTING COMPLETE DATA REGENERATION ===');
      
      // Step 1: Use the fixed database function to regenerate event_player_stats
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
      await debugPlayerPositions(playerId, playerName);
      
      // Use the complete regeneration service
      await this.regenerateAllPlayerStats();
      
      // Debug positions after regeneration
      console.log('🎯 POST-REGENERATION DEBUG:');
      await debugPlayerPositions(playerId, playerName);
      
      console.log(`🎉 REGENERATION COMPLETE FOR ${playerName}`);
    } catch (error) {
      console.error('Error in debug and regeneration:', error);
      throw error;
    }
  }
};
