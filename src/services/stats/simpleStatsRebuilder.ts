
import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';

/**
 * SIMPLE STATS REBUILDER
 * 
 * Core principle: What you select in Team Selection = What shows in Stats
 * No transformations, no mapping, no complexity - just direct 1:1 copy
 */

export const simpleStatsRebuilder = {
  /**
   * Complete rebuild with the simplest possible approach
   */
  async rebuildAllStats(): Promise<void> {
    logger.log('🔄 Starting SIMPLE stats rebuild - direct copy from team selections');
    
    try {
      // Step 1: Clear all existing stats
      logger.log('Step 1: Clearing all existing event_player_stats...');
      const { error: clearError } = await supabase
        .from('event_player_stats')
        .delete()
        .gte('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
      
      if (clearError) {
        logger.error('Error clearing stats:', clearError);
        throw clearError;
      }
      
      logger.log('✅ Cleared all existing stats');

      // Step 2: Get all event selections
      logger.log('Step 2: Getting all event selections...');
      const { data: selections, error: selectionsError } = await supabase
        .from('event_selections')
        .select('*');
      
      if (selectionsError) {
        logger.error('Error fetching selections:', selectionsError);
        throw selectionsError;
      }

      if (!selections || selections.length === 0) {
        logger.log('No event selections found');
        return;
      }

      logger.log(`Found ${selections.length} event selections to process`);

      // Step 3: Process each selection and create stats records
      let totalRecordsCreated = 0;
      
      for (const selection of selections) {
        logger.log(`Processing selection for event ${selection.event_id}`);
        
        const playerPositions = selection.player_positions as any[];
        
        if (!playerPositions || playerPositions.length === 0) {
          logger.log(`No players in selection ${selection.id}`);
          continue;
        }

        // Create a stat record for each player in the selection
        for (const playerPos of playerPositions) {
          const playerId = playerPos.playerId || playerPos.player_id;
          const position = playerPos.position;
          const minutes = playerPos.minutes || selection.duration_minutes || 90;
          const isSubstitute = playerPos.isSubstitute || false;
          const isCaptain = playerId === selection.captain_id;

          if (!playerId || !position) {
            logger.log('Skipping player with missing ID or position:', playerPos);
            continue;
          }

          // Insert the stat record - exact copy from selection
          const { error: insertError } = await supabase
            .from('event_player_stats')
            .insert({
              event_id: selection.event_id,
              player_id: playerId,
              team_number: selection.team_number || 1,
              period_number: selection.period_number || 1,
              position: position, // EXACT position from team selection
              minutes_played: minutes, // EXACT minutes from team selection
              is_captain: isCaptain,
              is_substitute: isSubstitute,
              substitution_time: playerPos.substitution_time || null,
              performance_category_id: selection.performance_category_id
            });

          if (insertError) {
            logger.error('Error inserting stat:', insertError);
            continue; // Continue with other players
          }

          totalRecordsCreated++;
          
          // Log for verification
          logger.log(`✅ Created stat: Player ${playerId}, Position "${position}", Minutes ${minutes}`);
        }
      }

      logger.log(`🎉 Successfully created ${totalRecordsCreated} stat records`);

      // Step 4: Update player match stats using existing function
      logger.log('Step 4: Updating player match statistics...');
      const { error: updateError } = await supabase.rpc('update_all_completed_events_stats');
      
      if (updateError) {
        logger.error('Error updating match stats:', updateError);
        throw updateError;
      }
      
      logger.log('✅ Successfully updated all player match statistics');
      logger.log('🎉 SIMPLE REBUILD COMPLETED SUCCESSFULLY');
      
    } catch (error) {
      logger.error('❌ Error in simple rebuild:', error);
      throw error;
    }
  }
};
