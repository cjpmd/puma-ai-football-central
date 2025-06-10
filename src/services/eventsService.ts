
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
  kit_selection?: 'home' | 'away' | 'training';
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

    return data as DatabaseEvent;
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
    
    // Ensure all fields are properly included in the update
    const cleanUpdateData = {
      team_id: updateData.team_id,
      title: updateData.title,
      description: updateData.description,
      date: updateData.date,
      start_time: updateData.start_time,
      end_time: updateData.end_time,
      location: updateData.location,
      notes: updateData.notes,
      event_type: updateData.event_type,
      opponent: updateData.opponent,
      is_home: updateData.is_home,
      scores: updateData.scores,
      player_of_match_id: updateData.player_of_match_id,
      game_format: updateData.game_format,
      kit_selection: updateData.kit_selection, // Explicitly include kit_selection
      coach_notes: updateData.coach_notes,
      staff_notes: updateData.staff_notes,
      training_notes: updateData.training_notes,
      updated_at: new Date().toISOString()
    };
    
    console.log('Clean update data with kit_selection:', cleanUpdateData);
    
    const { data, error } = await supabase
      .from('events')
      .update(cleanUpdateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating event:', error);
      throw error;
    }
    console.log('Event updated successfully with kit_selection:', data);
    return data as DatabaseEvent;
  },

  async deleteEvent(eventId: string, eventTitle?: string): Promise<void> {
    // Show confirmation dialog
    const confirmMessage = eventTitle 
      ? `Are you sure you want to delete the event "${eventTitle}"? This action cannot be undone.`
      : 'Are you sure you want to delete this event? This action cannot be undone.';
    
    if (!window.confirm(confirmMessage)) {
      throw new Error('Event deletion cancelled by user');
    }

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
