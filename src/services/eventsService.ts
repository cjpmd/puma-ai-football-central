
import { supabase } from '@/integrations/supabase/client';
import { DatabaseEvent } from '@/types/event';

export interface CreateEventData {
  team_id: string;
  title: string;
  description?: string;
  date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  notes?: string;
  event_type: 'training' | 'match' | 'fixture';
}

export interface UpdateEventData extends CreateEventData {
  id: string;
}

export const eventsService = {
  async getEventsByTeamId(teamId: string): Promise<DatabaseEvent[]> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('team_id', teamId)
      .order('date', { ascending: true });

    if (error) throw error;
    return (data || []) as DatabaseEvent[];
  },

  async createEvent(eventData: CreateEventData): Promise<DatabaseEvent> {
    const { data, error } = await supabase
      .from('events')
      .insert([eventData])
      .select()
      .single();

    if (error) throw error;
    return data as DatabaseEvent;
  },

  async updateEvent(eventData: UpdateEventData): Promise<DatabaseEvent> {
    const { id, ...updateData } = eventData;
    const { data, error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as DatabaseEvent;
  },

  async deleteEvent(eventId: string): Promise<void> {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (error) throw error;
  }
};
