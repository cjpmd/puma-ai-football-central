import { supabase } from '@/integrations/supabase/client';

export const positionStandardizationService = {
  /**
   * Regenerate all player stats with standardized position names
   */
  async regenerateAllPlayerStatsWithStandardizedPositions(): Promise<void> {
    console.log('🔧 Starting complete data regeneration with position standardization...');
    
    try {
      // Step 1: Regenerate event_player_stats with standardized positions
      console.log('Step 1: Regenerating event_player_stats with standardized positions...');
      const { error: regenerateError } = await supabase.rpc('regenerate_all_event_player_stats');
      
      if (regenerateError) {
        console.error('Error in standardized regeneration function:', regenerateError);
        throw regenerateError;
      }
      
      console.log('✅ Successfully regenerated event_player_stats with standardized positions');
      
      // Step 2: Update all player match stats
      console.log('Step 2: Updating all player match statistics with standardized positions...');
      const { error: updateError } = await supabase.rpc('update_all_completed_events_stats');
      
      if (updateError) {
        console.error('Error updating match stats with standardized positions:', updateError);
        throw updateError;
      }
      
      console.log('✅ Successfully updated all player match statistics with standardized positions');
      
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
      
      console.log(`📊 Final stats: ${statsCount?.length || 0} records created`);
      console.log('📍 Standardized positions in use:', uniquePositions);
      console.log('🎉 POSITION STANDARDIZATION COMPLETE - All player stats now use consistent position names');
      
    } catch (error) {
      console.error('❌ Error in position standardization:', error);
      throw error;
    }
  },

  /**
   * Test the standardization function with sample inputs
   */
  async testPositionStandardization(): Promise<void> {
    console.log('🧪 Testing position standardization function...');
    
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
        
        console.log(`"${position}" → "${data}"`);
      }
      
      console.log('✅ Position standardization test complete');
    } catch (error) {
      console.error('❌ Error testing position standardization:', error);
      throw error;
    }
  }
};