
import { supabase } from '@/integrations/supabase/client';

export const eventPlayerStatsService = {
  /**
   * Clear all existing event_player_stats
   */
  async clearAllEventPlayerStats(): Promise<void> {
    console.log('Step 1: Clearing existing event_player_stats...');
    const { error: clearError } = await supabase
      .from('event_player_stats')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (clearError) {
      console.error('Error clearing event_player_stats:', clearError);
      throw clearError;
    }
    console.log('✅ Cleared all existing event_player_stats');
  },

  /**
   * Create event_player_stats from event_selections using the FIXED database function
   */
  async regenerateFromSelections(): Promise<void> {
    console.log('=== REGENERATING EVENT_PLAYER_STATS FROM SELECTIONS WITH FIXED FUNCTION ===');
    
    try {
      // Use the FIXED database function
      const { error } = await supabase.rpc('regenerate_all_event_player_stats');
      
      if (error) {
        console.error('Error in FIXED regeneration function:', error);
        throw error;
      }
      
      // Verify the regeneration worked
      const { data: statsCount, error: verifyError } = await supabase
        .from('event_player_stats')
        .select('id', { count: 'exact' });
        
      if (verifyError) {
        console.error('Error verifying regenerated data:', verifyError);
      } else {
        console.log(`📊 REGENERATION SUMMARY: ${statsCount?.length || 0} records created with FIXED functions`);
      }
      
      console.log('🎉 SUCCESSFULLY REGENERATED EVENT_PLAYER_STATS WITH FIXED DATABASE FUNCTION');
    } catch (error) {
      console.error('Error in regeneration:', error);
      throw error;
    }
  },

  isEventCompleted(eventDate: string, endTime?: string): boolean {
    const today = new Date();
    const eventDateObj = new Date(eventDate);
    
    if (eventDateObj.toDateString() < today.toDateString()) {
      return true;
    }
    
    if (eventDateObj.toDateString() === today.toDateString() && endTime) {
      const now = new Date();
      const [hours, minutes] = endTime.split(':').map(Number);
      const eventEndTime = new Date();
      eventEndTime.setHours(hours, minutes, 0, 0);
      
      return now > eventEndTime;
    }
    
    return false;
  },

  /**
   * Debug a specific player's position data
   */
  async debugPlayerPositions(playerId: string, playerName: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('debug_player_positions', {
        p_player_id: playerId,
        p_player_name: playerName
      });
      
      if (error) {
        console.error('Error running debug function:', error);
      }
    } catch (error) {
      console.error('Error debugging player positions:', error);
    }
  }
};
