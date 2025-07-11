
import { supabase } from '@/integrations/supabase/client';

export interface UserAvailabilityStatus {
  eventId: string;
  status: 'pending' | 'available' | 'unavailable';
  source: 'direct' | 'player_linked';
}

export const userAvailabilityService = {
  async getUserAvailabilityForEvents(userId: string, eventIds?: string[]): Promise<UserAvailabilityStatus[]> {
    console.log('Loading availability for user:', userId);
    
    // Build the query for event availability
    let query = supabase
      .from('event_availability')
      .select('event_id, status')
      .eq('user_id', userId);
    
    if (eventIds && eventIds.length > 0) {
      query = query.in('event_id', eventIds);
    }

    const { data: directAvailability, error } = await query;

    if (error) {
      console.error('Error loading direct user availability:', error);
      throw error;
    }

    console.log('Direct availability records found:', directAvailability?.length || 0);

    // Check if user has linked players and get their availability
    const { data: linkedPlayers, error: linkedError } = await supabase
      .from('user_players')
      .select(`
        player_id,
        players!inner(
          id,
          name
        )
      `)
      .eq('user_id', userId);

    if (linkedError) {
      console.error('Error loading linked players:', linkedError);
    } else {
      console.log('Linked players found:', linkedPlayers?.length || 0, linkedPlayers);
    }

    // For now, return direct availability only
    // TODO: In the future, we might want to check player availability too
    const availability: UserAvailabilityStatus[] = (directAvailability || []).map(item => ({
      eventId: item.event_id,
      status: item.status as 'pending' | 'available' | 'unavailable',
      source: 'direct' as const
    }));

    console.log('Processed availability statuses:', availability);
    return availability;
  },

  async updateUserAvailability(
    userId: string,
    eventId: string,
    status: 'available' | 'unavailable'
  ): Promise<void> {
    console.log('Updating availability:', { userId, eventId, status });
    
    const { error } = await supabase.rpc('update_availability_status', {
      p_event_id: eventId,
      p_user_id: userId,
      p_role: 'player', // Default role
      p_status: status
    });

    if (error) {
      console.error('Error updating availability status:', error);
      throw error;
    }
    
    console.log('Availability status updated successfully');
  }
};
