
import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';

export const dataRegenerationService = {
  /**
   * Complete data regeneration using the improved database functions
   */
  async regenerateAllPlayerStats(): Promise<void> {
    logger.log('🔄 Starting complete data regeneration with improved functions...');
    
    try {
      // Step 1: Regenerate event_player_stats from event_selections using FIXED function
      logger.log('Step 1: Regenerating event_player_stats from selections...');
      const { error: regenerateError } = await supabase.rpc('regenerate_all_event_player_stats');
      
      if (regenerateError) {
        logger.error('Error in regenerate function:', regenerateError);
        throw regenerateError;
      }
      
      logger.log('✅ Successfully regenerated event_player_stats');
      
      // Step 2: Update all player match stats using FIXED function
      logger.log('Step 2: Updating all player match statistics...');
      const { error: updateError } = await supabase.rpc('update_all_completed_events_stats');
      
      if (updateError) {
        logger.error('Error updating match stats:', updateError);
        throw updateError;
      }
      
      logger.log('✅ Successfully updated all player match statistics');
      
      // Verify the results
      const { data: statsCount } = await supabase
        .from('event_player_stats')
        .select('id', { count: 'exact' })
        .limit(1);
        
      logger.log(`📊 Final event_player_stats count: ${statsCount?.length || 0}`);
      logger.log('🎉 COMPLETE DATA REGENERATION SUCCESSFUL');
      
    } catch (error) {
      logger.error('❌ Error in complete regeneration:', error);
      throw error;
    }
  },

  /**
   * Debug and regenerate for a specific player using improved functions
   */
  async debugAndRegenerateForPlayer(playerId: string, playerName: string): Promise<void> {
    logger.log(`🎯 Starting debug and regeneration for player: ${playerName} (${playerId})`);
    
    try {
      // Debug the player first
      await this.debugPlayerPositions(playerId, playerName);
      
      // Regenerate all data (affects this player too)
      logger.log('🔄 Running full regeneration to ensure data consistency...');
      await this.regenerateAllPlayerStats();
      
      // Update specific player stats
      logger.log(`📊 Updating match stats for ${playerName}...`);
      const { error: playerUpdateError } = await supabase.rpc('update_player_match_stats', {
        player_uuid: playerId
      });
      
      if (playerUpdateError) {
        logger.error(`Error updating ${playerName} stats:`, playerUpdateError);
        throw playerUpdateError;
      }
      
      logger.log(`✅ Successfully updated ${playerName} stats`);
      logger.log(`🎉 COMPLETE DEBUG AND REGENERATION FOR ${playerName} SUCCESSFUL`);
      
    } catch (error) {
      logger.error(`❌ Error in debug and regeneration for ${playerName}:`, error);
      throw error;
    }
  },

  /**
   * Debug a specific player's position data
   */
  async debugPlayerPositions(playerId: string, playerName: string): Promise<void> {
    try {
      logger.log(`🔍 Debugging positions for ${playerName} (${playerId})`);
      
      const { error } = await supabase.rpc('debug_player_positions', {
        p_player_id: playerId,
        p_player_name: playerName
      });
      
      if (error) {
        logger.error('Error running debug function:', error);
        throw error;
      }
      
      logger.log(`✅ Debug complete for ${playerName}`);
    } catch (error) {
      logger.error(`Error debugging player positions for ${playerName}:`, error);
      throw error;
    }
  }
};
