
import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';

export const updatePlayerStatsFromEvent = async (eventId: string) => {
  try {
    logger.log('Updating player stats for event with performance category support:', eventId);
    
    // The database now handles this automatically via triggers and includes performance category tracking
    // We just need to call the database function to update player stats
    // for all players in this event
    
    const { error } = await supabase.rpc('update_event_player_stats', {
      event_uuid: eventId
    });

    if (error) {
      logger.error('Error updating player stats:', error);
      return;
    }

    logger.log('Successfully updated player stats with performance categories for event:', eventId);

  } catch (error) {
    logger.error('Error updating player stats from event:', error);
  }
};
