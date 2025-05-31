
import { supabase } from '@/integrations/supabase/client';

export const updatePlayerStatsFromEvent = async (eventId: string) => {
  try {
    console.log('Updating player stats for event:', eventId);
    
    // The database now handles this automatically via triggers
    // We just need to call the database function to update player stats
    // for all players in this event
    
    const { error } = await supabase.rpc('update_event_player_stats', {
      event_uuid: eventId
    });

    if (error) {
      console.error('Error updating player stats:', error);
      return;
    }

    console.log('Successfully updated player stats for event:', eventId);

  } catch (error) {
    console.error('Error updating player stats from event:', error);
  }
};
