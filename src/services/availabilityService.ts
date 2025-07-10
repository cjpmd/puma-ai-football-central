
import { supabase } from '@/integrations/supabase/client';

export interface EventAvailability {
  id: string;
  event_id: string;
  user_id: string;
  role: 'player' | 'staff' | 'parent';
  status: 'pending' | 'available' | 'unavailable';
  responded_at?: string;
  notification_sent_at: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationLog {
  id: string;
  user_id: string;
  event_id?: string;
  notification_type: 'availability_request' | 'event_reminder' | 'event_update';
  method: 'email' | 'push' | 'sms';
  status: 'sent' | 'delivered' | 'failed' | 'opened';
  sent_at: string;
  delivered_at?: string;
  opened_at?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export const availabilityService = {
  async getEventAvailability(eventId: string): Promise<EventAvailability[]> {
    console.log('Getting event availability for event:', eventId);
    
    const { data, error } = await supabase
      .from('event_availability')
      .select(`
        *,
        profiles!event_availability_user_id_fkey(name, email)
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching event availability:', error);
      throw error;
    }
    
    console.log('Found availability records:', data?.length || 0);
    return (data || []) as EventAvailability[];
  },

  async updateAvailabilityStatus(
    eventId: string,
    userId: string,
    role: string,
    status: 'available' | 'unavailable'
  ): Promise<void> {
    console.log('Updating availability status:', { eventId, userId, role, status });
    
    const { error } = await supabase.rpc('update_availability_status', {
      p_event_id: eventId,
      p_user_id: userId,
      p_role: role,
      p_status: status
    });

    if (error) {
      console.error('Error updating availability status:', error);
      throw error;
    }
    
    console.log('Availability status updated successfully');
  },

  async sendAvailabilityNotifications(eventId: string): Promise<void> {
    console.log('Sending availability notifications for event:', eventId);
    
    try {
      const { error } = await supabase.rpc('send_availability_notifications', {
        p_event_id: eventId
      });

      if (error) {
        console.error('Error from send_availability_notifications RPC:', error);
        throw error;
      }
      
      console.log('Availability notifications sent successfully');
      
      // Let's also check what was created
      const { data: createdRecords } = await supabase
        .from('event_availability')
        .select('*')
        .eq('event_id', eventId);
        
      console.log('Created availability records:', createdRecords?.length || 0, createdRecords);
      
    } catch (error) {
      console.error('Error in sendAvailabilityNotifications:', error);
      throw error;
    }
  },

  async getUserAvailabilityForEvent(eventId: string, userId: string): Promise<EventAvailability[]> {
    const { data, error } = await supabase
      .from('event_availability')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', userId);

    if (error) throw error;
    return (data || []) as EventAvailability[];
  },

  async getUserNotifications(userId: string): Promise<NotificationLog[]> {
    const { data, error } = await supabase
      .from('notification_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return (data || []) as NotificationLog[];
  },

  // Add a method to manually create availability records for testing
  async createTestAvailabilityRecord(eventId: string, userId: string, role: string, status: string): Promise<void> {
    console.log('Creating test availability record:', { eventId, userId, role, status });
    
    const { data, error } = await supabase
      .from('event_availability')
      .insert({
        event_id: eventId,
        user_id: userId,
        role: role,
        status: status,
        notification_sent_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error('Error creating test availability record:', error);
      throw error;
    }
    
    console.log('Test availability record created:', data);
  }
};
