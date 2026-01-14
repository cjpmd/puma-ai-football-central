import { supabase } from '@/integrations/supabase/client';
import { getSharedUserIds, getBestAvailabilityStatus } from '@/services/sharedAvailabilityService';

export interface UserAvailabilityStatus {
  eventId: string;
  status: 'pending' | 'available' | 'unavailable';
  source: 'direct' | 'player_linked' | 'shared';
}

export const userAvailabilityService = {
  async getUserAvailabilityForEvents(userId: string, eventIds?: string[]): Promise<UserAvailabilityStatus[]> {
    console.log('=== USER AVAILABILITY SERVICE DEBUG ===');
    console.log('Loading availability for user:', userId);
    console.log('Event IDs filter:', eventIds);
    
    // Get all users that share availability with this user (linked via same players)
    const sharedUserIds = await getSharedUserIds(userId);
    console.log('Shared user IDs:', sharedUserIds);

    // Build the query for event availability for all shared users
    let query = supabase
      .from('event_availability')
      .select('event_id, status, user_id')
      .in('user_id', sharedUserIds);
    
    if (eventIds && eventIds.length > 0) {
      query = query.in('event_id', eventIds);
    }

    const { data: allAvailability, error } = await query;

    if (error) {
      console.error('Error loading availability:', error);
      throw error;
    }

    console.log('All availability records found:', allAvailability?.length || 0);

    // Group by event and get best status
    const eventGroups = new Map<string, Array<{ status: string; user_id: string }>>();
    
    (allAvailability || []).forEach(item => {
      const existing = eventGroups.get(item.event_id) || [];
      existing.push({ status: item.status, user_id: item.user_id });
      eventGroups.set(item.event_id, existing);
    });

    // Build final availability list with best status for each event
    const availability: UserAvailabilityStatus[] = [];
    
    eventGroups.forEach((records, eventId) => {
      const { status } = getBestAvailabilityStatus(records);
      const source = records.some(r => r.user_id === userId) ? 'direct' : 'shared';
      
      availability.push({
        eventId,
        status: status as 'pending' | 'available' | 'unavailable',
        source: source as 'direct' | 'shared'
      });
    });

    console.log('Final processed availability statuses:', availability);
    console.log('=== END USER AVAILABILITY SERVICE DEBUG ===');
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
