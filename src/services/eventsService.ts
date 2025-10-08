import { supabase } from '@/integrations/supabase/client';
import { Event } from '@/types';

export const eventsService = {
  async createEvent(eventData: Partial<Event>, invitations?: {
    type: 'everyone' | 'pick_squad',
    selectedPlayerIds?: string[],
    selectedStaffIds?: string[]
  }) {
    try {
      console.log('Creating event with data:', eventData);
      
      const formattedData = {
        team_id: eventData.teamId,
        title: eventData.title,
        description: eventData.description,
        date: eventData.date,
        start_time: eventData.startTime || null, // Convert empty string to null
        end_time: eventData.endTime || null, // Convert empty string to null
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
        meeting_time: eventData.meetingTime || null, // Convert empty string to null
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
          team_number: index + 1,
          start_time: team.start_time || eventData.startTime || null,
          meeting_time: team.meeting_time || eventData.meetingTime || null
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
            team_number: 1,
            start_time: eventData.startTime || null,
            meeting_time: eventData.meetingTime || null
          });
          
        if (eventTeamError) {
          console.error('Error creating default event team:', eventTeamError);
        } else {
          console.log('Default event team created successfully');
        }
      }
      
      // Create invitations if specified
      if (invitations) {
        await this.createEventInvitations(data.id, eventData.teamId!, invitations);
      }
      
      return data;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  },
  
  async createEventInvitations(
    eventId: string,
    teamId: string,
    invitations: {
      type: 'everyone' | 'pick_squad',
      selectedPlayerIds?: string[],
      selectedStaffIds?: string[]
    }
  ) {
    try {
      console.log('Creating event invitations:', invitations);
      
      const invitationRecords: any[] = [];
      
      if (invitations.type === 'everyone') {
        // Get all active players for the team
        const { data: players, error: playersError } = await supabase
          .from('players')
          .select('id')
          .eq('team_id', teamId)
          .eq('is_active', true);
          
        if (playersError) throw playersError;
        
        // Get all active staff for the team  
        const { data: staff, error: staffError } = await supabase
          .from('team_staff')
          .select('id')
          .eq('team_id', teamId)
          .eq('is_active', true);
          
        if (staffError) throw staffError;
        
        // Get user IDs for players
        const { data: playerUsers, error: playerUsersError } = await supabase
          .from('user_players')
          .select('user_id, player_id')
          .in('player_id', (players || []).map(p => p.id));
          
        if (playerUsersError) throw playerUsersError;
        
        // Get user IDs for staff
        const { data: staffUsers, error: staffUsersError } = await supabase
          .from('user_staff')
          .select('user_id, staff_id')
          .in('staff_id', (staff || []).map(s => s.id));
          
        if (staffUsersError) throw staffUsersError;
        
        // Create invitation records for players
        (playerUsers || []).forEach(pu => {
          invitationRecords.push({
            event_id: eventId,
            user_id: pu.user_id,
            invitee_type: 'player',
            player_id: pu.player_id
          });
        });
        
        // Create invitation records for staff
        (staffUsers || []).forEach(su => {
          invitationRecords.push({
            event_id: eventId,
            user_id: su.user_id,
            invitee_type: 'staff',
            staff_id: su.staff_id
          });
        });
      } else {
        // Pick squad - use selected IDs
        if (invitations.selectedPlayerIds && invitations.selectedPlayerIds.length > 0) {
          const { data: playerUsers, error: playerUsersError } = await supabase
            .from('user_players')
            .select('user_id, player_id')
            .in('player_id', invitations.selectedPlayerIds);
            
          if (playerUsersError) throw playerUsersError;
          
          (playerUsers || []).forEach(pu => {
            invitationRecords.push({
              event_id: eventId,
              user_id: pu.user_id,
              invitee_type: 'player',
              player_id: pu.player_id
            });
          });
        }
        
        if (invitations.selectedStaffIds && invitations.selectedStaffIds.length > 0) {
          const { data: staffUsers, error: staffUsersError } = await supabase
            .from('user_staff')
            .select('user_id, staff_id')
            .in('staff_id', invitations.selectedStaffIds);
            
          if (staffUsersError) throw staffUsersError;
          
          (staffUsers || []).forEach(su => {
            invitationRecords.push({
              event_id: eventId,
              user_id: su.user_id,
              invitee_type: 'staff',
              staff_id: su.staff_id
            });
          });
        }
      }
      
      if (invitationRecords.length > 0) {
        const { error: insertError } = await supabase
          .from('event_invitations')
          .insert(invitationRecords);
          
        if (insertError) {
          console.error('Error inserting invitations:', insertError);
          throw insertError;
        }
        
        console.log(`Created ${invitationRecords.length} invitations for event ${eventId}`);
      }
    } catch (error) {
      console.error('Error creating event invitations:', error);
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
        start_time: eventData.startTime || null, // Convert empty string to null
        end_time: eventData.endTime || null, // Convert empty string to null
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
        meeting_time: eventData.meetingTime || null, // Convert empty string to null
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
