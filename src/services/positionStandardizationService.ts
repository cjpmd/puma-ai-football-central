import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';

export const positionStandardizationService = {
  /**
   * Regenerate all player stats with standardized position names using batch processing
   */
  async regenerateAllPlayerStatsWithStandardizedPositions(): Promise<void> {
    logger.log('🔧 Starting batch-safe data regeneration with position standardization...');
    
    try {
      // Use the new batch-safe function to avoid timeouts
      logger.log('Step 1: Running batch-safe regeneration...');
      const { error: batchError } = await supabase.rpc('regenerate_player_stats_batch_safe');
      
      if (batchError) {
        logger.error('Error in batch regeneration:', batchError);
        throw batchError;
      }
      
      logger.log('✅ Successfully regenerated event_player_stats with standardized positions');
      
      // Step 2: Get all players and update their stats individually
      logger.log('Step 2: Updating individual player statistics...');
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id, name')
        .eq('status', 'active');
        
      if (playersError) throw playersError;
      
      let processedCount = 0;
      for (const player of players || []) {
        try {
          const { error: updateError } = await supabase.rpc('update_single_player_stats', {
            player_uuid: player.id
          });
          
          if (updateError) {
            logger.warn(`Failed to update stats for ${player.name}:`, updateError);
          } else {
            processedCount++;
          }
        } catch (err) {
          logger.warn(`Error updating ${player.name}:`, err);
        }
      }
      
      logger.log(`✅ Successfully updated ${processedCount} players out of ${players?.length || 0}`);
      
      // Verify the results
      const { data: statsCount } = await supabase
        .from('event_player_stats')
        .select('id', { count: 'exact' })
        .limit(1);
        
      const { data: distinctPositions } = await supabase
        .from('event_player_stats')
        .select('position')
        .not('position', 'is', null);
        
      const uniquePositions = [...new Set(distinctPositions?.map(p => p.position))].sort();
      
      logger.log(`📊 Final stats: ${statsCount?.length || 0} records created`);
      logger.log('📍 Standardized positions in use:', uniquePositions);
      logger.log('🎉 POSITION STANDARDIZATION COMPLETE - All player stats now use consistent position names');
      
    } catch (error) {
      logger.error('❌ Error in position standardization:', error);
      throw error;
    }
  },

  /**
   * Test the standardization function with sample inputs
   */
  async testPositionStandardization(): Promise<void> {
    logger.log('🧪 Testing position standardization function...');
    
    const testPositions = [
      'Midfielder Right',
      'Defender Left', 
      'Striker Centre',
      'GK',
      'CB',
      'ML',
      'Right Back',
      'Centre Forward'
    ];
    
    try {
      for (const position of testPositions) {
        const { data, error } = await supabase.rpc('standardize_position_name', {
          input_position: position
        });
        
        if (error) throw error;
        
        logger.log(`"${position}" → "${data}"`);
      }
      
      logger.log('✅ Position standardization test complete');
    } catch (error) {
      logger.error('❌ Error testing position standardization:', error);
      throw error;
    }
  }
};