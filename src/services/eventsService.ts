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
        console.log('Creating invitations for event:', data.id, 'with data:', invitations);
        await this.createEventInvitations(data.id, eventData.teamId!, invitations);
      } else {
        console.log('No invitations data provided');
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
        // @ts-ignore - Supabase type inference causes excessive depth
        const playersResult: any = await supabase
          .from('players')
          .select('id')
          .eq('team_id', teamId)
          .eq('status', 'active');
          
        if (playersResult.error) throw playersResult.error;
        const players = playersResult.data;
        
        // Get all active staff for the team from team_staff table
        // @ts-ignore - Supabase type inference causes excessive depth
        const staffResult: any = await supabase
          .from('team_staff')
          .select('id')
          .eq('team_id', teamId);
          
        if (staffResult.error) throw staffResult.error;
        const staff = staffResult.data;
        
        // Also get staff from user_teams (users with staff-like roles)
        // @ts-ignore - Supabase type inference causes excessive depth
        const userTeamsStaffResult: any = await supabase
          .from('user_teams')
          .select('user_id, role')
          .eq('team_id', teamId)
          .in('role', ['team_manager', 'team_assistant_manager', 'team_coach', 'manager', 'coach', 'staff', 'helper', 'team_helper']);
        
        if (userTeamsStaffResult.error) throw userTeamsStaffResult.error;
        const userTeamsStaff = userTeamsStaffResult.data || [];
        
        // Get user IDs for players
        const playerUsersResult: any = await supabase
          .from('user_players')
          .select('user_id, player_id')
          .in('player_id', (players || []).map((p: any) => p.id));
        if (playerUsersResult.error) throw playerUsersResult.error;
        const playerUsers = playerUsersResult.data || [];
        
        // Get user IDs for team_staff
        const staffUsersResult: any = await supabase
          .from('user_staff')
          .select('user_id, staff_id')
          .in('staff_id', (staff || []).map((s: any) => s.id));
        if (staffUsersResult.error) throw staffUsersResult.error;
        const staffUsers = staffUsersResult.data || [];
        
        // Add user_teams staff to staffUsers (they already have user_id)
        const userTeamsStaffUsers = userTeamsStaff.map((uts: any) => ({
          user_id: uts.user_id,
          staff_id: null // No staff_id for user_teams entries
        }));
        
        // Create invitation records for players (with or without linked users)
        const mappedPlayerIds = new Set(playerUsers.map((pu: any) => pu.player_id));
        playerUsers.forEach((pu: any) => {
          invitationRecords.push({
            event_id: eventId,
            user_id: pu.user_id,
            invitee_type: 'player',
            player_id: pu.player_id
          });
        });
        (players || []).forEach((p: any) => {
          if (!mappedPlayerIds.has(p.id)) {
            invitationRecords.push({
              event_id: eventId,
              user_id: null, // no linked user
              invitee_type: 'player',
              player_id: p.id
            });
          }
        });
        
        // Create invitation records for team_staff (with or without linked users)
        const mappedStaffIds = new Set(staffUsers.map((su: any) => su.staff_id));
        staffUsers.forEach((su: any) => {
          invitationRecords.push({
            event_id: eventId,
            user_id: su.user_id,
            invitee_type: 'staff',
            staff_id: su.staff_id
          });
        });
        (staff || []).forEach((s: any) => {
          if (!mappedStaffIds.has(s.id)) {
            invitationRecords.push({
              event_id: eventId,
              user_id: null,
              invitee_type: 'staff',
              staff_id: s.id
            });
          }
        });
        
        // Create invitation records for user_teams staff (already have user_id, no staff_id)
        userTeamsStaffUsers.forEach((su: any) => {
          invitationRecords.push({
            event_id: eventId,
            user_id: su.user_id,
            invitee_type: 'staff',
            staff_id: null
          });
        });
      } else {
        // Pick squad - use selected IDs
        if (invitations.selectedPlayerIds && invitations.selectedPlayerIds.length > 0) {
          const playerUsersResult: any = await supabase
            .from('user_players')
            .select('user_id, player_id')
            .in('player_id', invitations.selectedPlayerIds);
          
          if (playerUsersResult.error) throw playerUsersResult.error;
          const playerUsers = playerUsersResult.data || [];
          
          const mappedPlayerIds = new Set(playerUsers.map((pu: any) => pu.player_id));
          // Linked users
          playerUsers.forEach((pu: any) => {
            invitationRecords.push({
              event_id: eventId,
              user_id: pu.user_id,
              invitee_type: 'player',
              player_id: pu.player_id
            });
          });
          // No linked users
          invitations.selectedPlayerIds.forEach((pid) => {
            if (!mappedPlayerIds.has(pid)) {
              invitationRecords.push({
                event_id: eventId,
                user_id: null,
                invitee_type: 'player',
                player_id: pid
              });
            }
          });
        }
        
        if (invitations.selectedStaffIds && invitations.selectedStaffIds.length > 0) {
          const staffUsersResult: any = await supabase
            .from('user_staff')
            .select('user_id, staff_id')
            .in('staff_id', invitations.selectedStaffIds);
          
          if (staffUsersResult.error) throw staffUsersResult.error;
          const staffUsers = staffUsersResult.data || [];
          
          const mappedStaffIds = new Set(staffUsers.map((su: any) => su.staff_id));
          // Linked users
          staffUsers.forEach((su: any) => {
            invitationRecords.push({
              event_id: eventId,
              user_id: su.user_id,
              invitee_type: 'staff',
              staff_id: su.staff_id
            });
          });
          // No linked users
          invitations.selectedStaffIds.forEach((sid) => {
            if (!mappedStaffIds.has(sid)) {
              invitationRecords.push({
                event_id: eventId,
                user_id: null,
                invitee_type: 'staff',
                staff_id: sid
              });
            }
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

        // Create event_availability records for users with linked accounts
        const availabilityRecords = invitationRecords
          .filter(inv => inv.user_id) // Only for users with linked accounts
          .map(inv => ({
            event_id: eventId,
            user_id: inv.user_id,
            role: inv.invitee_type, // 'player' or 'staff'
            status: 'pending' as const,
            notification_sent_at: new Date().toISOString()
          }));

        if (availabilityRecords.length > 0) {
          const { error: availabilityError } = await supabase
            .from('event_availability')
            .upsert(availabilityRecords, {
              onConflict: 'event_id,user_id,role'
            });
          if (availabilityError) {
            console.error('Error creating availability records:', availabilityError);
          } else {
            console.log(`Created ${availabilityRecords.length} availability records for event ${eventId}`);
          }

          // Send push notifications to users with linked accounts
          const userIds = availabilityRecords.map(r => r.user_id);
          await this.sendEventNotifications(eventId, userIds);
        }
      }
    } catch (error) {
      console.error('Error creating event invitations:', error);
      throw error;
    }
  },
  
  async updateEvent(
    eventData: Partial<Event> & { id: string },
    invitations?: {
      type: 'everyone' | 'pick_squad',
      selectedPlayerIds?: string[],
      selectedStaffIds?: string[]
    }
  ) {
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

      // Handle invitations update if provided
      if (invitations) {
        console.log('Updating invitations for event:', eventData.id, invitations);
        // Delete existing invitations
        await supabase
          .from('event_invitations')
          .delete()
          .eq('event_id', eventData.id);

        const invitationRecords: any[] = [];

        if (invitations.type === 'everyone') {
          // No specific invites retained (clear all)
        } else {
          if (invitations.selectedPlayerIds && invitations.selectedPlayerIds.length > 0) {
            const playerUsersResult: any = await supabase
              .from('user_players')
              .select('user_id, player_id')
              .in('player_id', invitations.selectedPlayerIds);
            if (playerUsersResult.error) throw playerUsersResult.error;
            const playerUsers = playerUsersResult.data || [];

            const mappedPlayerIds = new Set(playerUsers.map((pu: any) => pu.player_id));
            // Linked users
            playerUsers.forEach((pu: any) => {
              invitationRecords.push({
                event_id: eventData.id,
                user_id: pu.user_id,
                invitee_type: 'player',
                player_id: pu.player_id,
              });
            });
            // No linked users
            invitations.selectedPlayerIds.forEach((pid) => {
              if (!mappedPlayerIds.has(pid)) {
                invitationRecords.push({
                  event_id: eventData.id,
                  user_id: null,
                  invitee_type: 'player',
                  player_id: pid,
                });
              }
            });
          }

          if (invitations.selectedStaffIds && invitations.selectedStaffIds.length > 0) {
            const staffUsersResult: any = await supabase
              .from('user_staff')
              .select('user_id, staff_id')
              .in('staff_id', invitations.selectedStaffIds);
            if (staffUsersResult.error) throw staffUsersResult.error;
            const staffUsers = staffUsersResult.data || [];

            const mappedStaffIds = new Set(staffUsers.map((su: any) => su.staff_id));
            // Linked users
            staffUsers.forEach((su: any) => {
              invitationRecords.push({
                event_id: eventData.id,
                user_id: su.user_id,
                invitee_type: 'staff',
                staff_id: su.staff_id,
              });
            });
            // No linked users
            invitations.selectedStaffIds.forEach((sid) => {
              if (!mappedStaffIds.has(sid)) {
                invitationRecords.push({
                  event_id: eventData.id,
                  user_id: null,
                  invitee_type: 'staff',
                  staff_id: sid,
                });
              }
            });
          }
        }

        if (invitationRecords.length > 0) {
          const { error: insertError } = await supabase
            .from('event_invitations')
            .insert(invitationRecords);
          if (insertError) throw insertError;

          // Create event_availability records for users with linked accounts
          const availabilityRecords = invitationRecords
            .filter(inv => inv.user_id) // Only for users with linked accounts
            .map(inv => ({
              event_id: eventData.id,
              user_id: inv.user_id,
              role: inv.invitee_type, // 'player' or 'staff'
              status: 'pending' as const,
              notification_sent_at: new Date().toISOString()
            }));

          if (availabilityRecords.length > 0) {
            const { error: availabilityError } = await supabase
              .from('event_availability')
              .upsert(availabilityRecords, {
                onConflict: 'event_id,user_id,role'
              });
            if (availabilityError) {
              console.error('Error creating availability records:', availabilityError);
            }
          }
        }
      }
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

  async sendEventNotifications(eventId: string, userIds: string[]) {
    try {
      // Get event details for the notification message
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('title, date, event_type, opponent, teams!inner(name)')
        .eq('id', eventId)
        .single();

      if (eventError) {
        console.error('Error fetching event for notification:', eventError);
        return;
      }

      const eventDate = new Date(event.date).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });

      let title = 'New Event';
      let body = `${event.title} on ${eventDate}`;

      if (event.event_type === 'match' && event.opponent) {
        title = 'Match Availability Request';
        body = `vs ${event.opponent} on ${eventDate} - Please confirm your availability`;
      } else if (event.event_type === 'training') {
        title = 'Training Session';
        body = `${event.title} on ${eventDate} - Please confirm your availability`;
      } else {
        title = 'Event Notification';
        body = `${event.title} on ${eventDate} - Please confirm your availability`;
      }

      console.log('Sending push notifications for event:', eventId, 'to users:', userIds.length);

      // Call the edge function to send push notifications
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          eventId,
          title,
          body,
          userIds
        }
      });

      if (error) {
        console.error('Error sending push notifications:', error);
      } else {
        console.log('Push notifications sent successfully for event:', eventId);
      }
    } catch (error) {
      console.error('Error in sendEventNotifications:', error);
      // Don't throw - notifications failing shouldn't break event creation
    }
  }
};
