
import { supabase } from '@/integrations/supabase/client';

export const dataRegenerationService = {
  /**
   * Complete data regeneration using the improved database functions
   */
  async regenerateAllPlayerStats(): Promise<void> {
    console.log('🔄 Starting complete data regeneration with improved functions...');
    
    try {
      // Step 1: Regenerate event_player_stats from event_selections using FIXED function
      console.log('Step 1: Regenerating event_player_stats from selections...');
      const { error: regenerateError } = await supabase.rpc('regenerate_all_event_player_stats');
      
      if (regenerateError) {
        console.error('Error in regenerate function:', regenerateError);
        throw regenerateError;
      }
      
      console.log('✅ Successfully regenerated event_player_stats');
      
      // Step 2: Update all player match stats using FIXED function
      console.log('Step 2: Updating all player match statistics...');
      const { error: updateError } = await supabase.rpc('update_all_completed_events_stats');
      
      if (updateError) {
        console.error('Error updating match stats:', updateError);
        throw updateError;
      }
      
      console.log('✅ Successfully updated all player match statistics');
      
      // Verify the results
      const { data: statsCount } = await supabase
        .from('event_player_stats')
        .select('id', { count: 'exact' })
        .limit(1);
        
      console.log(`📊 Final event_player_stats count: ${statsCount?.length || 0}`);
      console.log('🎉 COMPLETE DATA REGENERATION SUCCESSFUL');
      
    } catch (error) {
      console.error('❌ Error in complete regeneration:', error);
      throw error;
    }
  },

  /**
   * Debug and regenerate for a specific player using improved functions
   */
  async debugAndRegenerateForPlayer(playerId: string, playerName: string): Promise<void> {
    console.log(`🎯 Starting debug and regeneration for player: ${playerName} (${playerId})`);
    
    try {
      // Debug the player first
      await this.debugPlayerPositions(playerId, playerName);
      
      // Regenerate all data (affects this player too)
      console.log('🔄 Running full regeneration to ensure data consistency...');
      await this.regenerateAllPlayerStats();
      
      // Update specific player stats
      console.log(`📊 Updating match stats for ${playerName}...`);
      const { error: playerUpdateError } = await supabase.rpc('update_player_match_stats', {
        player_uuid: playerId
      });
      
      if (playerUpdateError) {
        console.error(`Error updating ${playerName} stats:`, playerUpdateError);
        throw playerUpdateError;
      }
      
      console.log(`✅ Successfully updated ${playerName} stats`);
      console.log(`🎉 COMPLETE DEBUG AND REGENERATION FOR ${playerName} SUCCESSFUL`);
      
    } catch (error) {
      console.error(`❌ Error in debug and regeneration for ${playerName}:`, error);
      throw error;
    }
  },

  /**
   * Debug a specific player's position data
   */
  async debugPlayerPositions(playerId: string, playerName: string): Promise<void> {
    try {
      console.log(`🔍 Debugging positions for ${playerName} (${playerId})`);
      
      const { error } = await supabase.rpc('debug_player_positions', {
        p_player_id: playerId,
        p_player_name: playerName
      });
      
      if (error) {
        console.error('Error running debug function:', error);
        throw error;
      }
      
      console.log(`✅ Debug complete for ${playerName}`);
    } catch (error) {
      console.error(`Error debugging player positions for ${playerName}:`, error);
      throw error;
    }
  }
};
