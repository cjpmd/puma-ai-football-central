import { supabase } from '@/integrations/supabase/client';
import { Event } from '@/types';

export const eventsService = {
  async createEvent(eventData: Partial<Event>) {
    try {
      console.log('Creating event with data:', eventData);
      
      const formattedData = {
        team_id: eventData.teamId,
        title: eventData.title,
        description: eventData.description,
        date: eventData.date,
        start_time: eventData.startTime,
        end_time: eventData.endTime,
        event_type: eventData.type,
        location: eventData.location,
        latitude: eventData.latitude,
        longitude: eventData.longitude,
        game_format: eventData.gameFormat,
        game_duration: eventData.gameDuration,
        opponent: eventData.opponent,
        is_home: eventData.isHome,
        kit_selection: eventData.kitSelection,
        teams: eventData.teams,  // Save the teams array
        facility_id: eventData.facilityId || null, // Convert empty string to null
        meeting_time: eventData.meetingTime,
        notes: eventData.notes,
        training_notes: eventData.trainingNotes
      };
      
      const { data, error } = await supabase
        .from('events')
        .insert(formattedData)
        .select()
        .single();
        
      if (error) throw error;
      
      console.log('Event created successfully:', data);
      
      // Auto-create event teams based on the teams array
      if (eventData.teams && Array.isArray(eventData.teams) && eventData.teams.length > 0) {
        console.log('Creating event teams for:', eventData.teams);
        
        const eventTeams = eventData.teams.map((team: any, index: number) => ({
          event_id: data.id,
          team_id: team.id || eventData.teamId, // Use team.id if available, fallback to main teamId
          team_number: index + 1
        }));
        
        const { error: eventTeamsError } = await supabase
          .from('event_teams')
          .insert(eventTeams);
          
        if (eventTeamsError) {
          console.error('Error creating event teams:', eventTeamsError);
          // Don't throw here as the event was created successfully
        } else {
          console.log('Event teams created successfully');
        }
      } else if (eventData.teamId) {
        // Fallback: create a single event team entry
        const { error: eventTeamError } = await supabase
          .from('event_teams')
          .insert({
            event_id: data.id,
            team_id: eventData.teamId,
            team_number: 1
          });
          
        if (eventTeamError) {
          console.error('Error creating default event team:', eventTeamError);
        } else {
          console.log('Default event team created successfully');
        }
      }
      
      return data;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  },
  
  async updateEvent(eventData: Partial<Event> & { id: string }) {
    try {
      console.log('Updating event with data:', eventData);
      
      const formattedData = {
        team_id: eventData.teamId,
        title: eventData.title,
        description: eventData.description,
        date: eventData.date,
        start_time: eventData.startTime,
        end_time: eventData.endTime,
        event_type: eventData.type,
        location: eventData.location,
        latitude: eventData.latitude,
        longitude: eventData.longitude,
        game_format: eventData.gameFormat,
        game_duration: eventData.gameDuration,
        opponent: eventData.opponent,
        is_home: eventData.isHome,
        kit_selection: eventData.kitSelection,
        teams: eventData.teams,  // Save the teams array
        facility_id: eventData.facilityId || null, // Convert empty string to null
        meeting_time: eventData.meetingTime,
        notes: eventData.notes,
        training_notes: eventData.trainingNotes
      };
      
      const { data, error } = await supabase
        .from('events')
        .update(formattedData)
        .eq('id', eventData.id)
        .select()
        .single();
        
      if (error) throw error;
      
      console.log('Event updated successfully:', data);
      return data;
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  },
  
  async getEventById(eventId: string) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
        
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error fetching event:', error);
      throw error;
    }
  },
  
  async deleteEvent(eventId: string) {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  },
};
