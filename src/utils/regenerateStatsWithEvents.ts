import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';

/**
 * Regenerate all player stats to include match events (goals, assists, saves, cards)
 * Run this once after the migration to populate existing player data
 */
export async function regenerateAllPlayerStatsWithEvents() {
  try {
    logger.log('Starting regeneration of all player stats with match events...');
    
    // Get all players
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, name');
    
    if (playersError) throw playersError;
    
    logger.log(`Found ${players?.length || 0} players`);
    
    // Update each player's stats
    for (const player of players || []) {
      try {
        const { error } = await supabase
          .rpc('update_player_match_stats', { player_uuid: player.id });
        
        if (error) {
          logger.error(`Error updating stats for ${player.name}:`, error);
        } else {
          logger.log(`✓ Updated stats for ${player.name}`);
        }
      } catch (err) {
        logger.error(`Failed to update ${player.name}:`, err);
      }
    }
    
    logger.log('Regeneration complete!');
    return { success: true, playersUpdated: players?.length || 0 };
  } catch (error) {
    logger.error('Error regenerating player stats:', error);
    throw error;
  }
}
