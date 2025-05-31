
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
    const { data, error } = await supabase
      .from('event_availability')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as EventAvailability[];
  },

  async updateAvailabilityStatus(
    eventId: string,
    userId: string,
    role: string,
    status: 'available' | 'unavailable'
  ): Promise<void> {
    const { error } = await supabase.rpc('update_availability_status', {
      p_event_id: eventId,
      p_user_id: userId,
      p_role: role,
      p_status: status
    });

    if (error) throw error;
  },

  async sendAvailabilityNotifications(eventId: string): Promise<void> {
    const { error } = await supabase.rpc('send_availability_notifications', {
      p_event_id: eventId
    });

    if (error) throw error;
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
  }
};
