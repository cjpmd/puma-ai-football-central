import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';

/**
 * Regenerate player stats to include match events (goals, assists, saves, cards).
 *
 * Pass a teamId to scope the operation to one team.  Omitting teamId triggers a
 * full-table scan across every player in the database — only safe as a one-time
 * admin migration, never from a regular UI action.
 */
export async function regenerateAllPlayerStatsWithEvents(teamId?: string) {
  try {
    logger.log('Starting regeneration of player stats with match events...', { teamId });

    let query = supabase.from('players').select('id, name');
    if (teamId) {
      query = query.eq('team_id', teamId);
    } else {
      logger.warn('regenerateAllPlayerStatsWithEvents called without teamId — full table scan');
    }

    const { data: players, error: playersError } = await query;

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
