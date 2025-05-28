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
  event_type: 'training' | 'match' | 'fixture' | 'tournament' | 'festival' | 'social' | 'friendly';
  opponent?: string;
  is_home?: boolean;
  scores?: {
    home: number;
    away: number;
  };
  player_of_match_id?: string;
  game_format?: string;
}

export interface UpdateEventData extends CreateEventData {
  id: string;
  coach_notes?: string;
  staff_notes?: string;
  training_notes?: string;
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

  async getEventById(eventId: string): Promise<DatabaseEvent> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error) {
      console.error('Error fetching event:', error);
      throw new Error(error.message);
    }

    return data;
  },

  async createEvent(eventData: CreateEventData): Promise<DatabaseEvent> {
    console.log('Creating event with data:', eventData);
    
    const { data, error } = await supabase
      .from('events')
      .insert([eventData])
      .select()
      .single();

    if (error) {
      console.error('Error creating event:', error);
      throw error;
    }
    console.log('Event created successfully:', data);
    return data as DatabaseEvent;
  },

  async updateEvent(eventData: UpdateEventData): Promise<DatabaseEvent> {
    const { id, ...updateData } = eventData;
    console.log('Updating event with data:', updateData);
    
    const { data, error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating event:', error);
      throw error;
    }
    console.log('Event updated successfully:', data);
    return data as DatabaseEvent;
  },

  async deleteEvent(eventId: string): Promise<void> {
    // First delete any related event_player_stats
    const { error: statsError } = await supabase
      .from('event_player_stats')
      .delete()
      .eq('event_id', eventId);

    if (statsError) {
      console.error('Error deleting event player stats:', statsError);
      throw statsError;
    }

    // Then delete the event
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }
};
