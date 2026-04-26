import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';
import { Event } from '@/types';
import { addWeeks, addMonths, format } from 'date-fns';

// Helper function to generate recurring event dates
const generateRecurringDates = (
  startDate: string,
  pattern: 'weekly' | 'biweekly' | 'monthly',
  dayOfWeek: number,
  endCondition: { type: 'occurrences', count: number } | { type: 'endDate', date: string }
): string[] => {
  const dates: string[] = [];
  let currentDate = new Date(startDate);
  
  // Adjust to correct day of week if needed
  while (currentDate.getDay() !== dayOfWeek) {
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  const maxIterations = 100; // Safety limit
  let iteration = 0;
  const endDate = endCondition.type === 'endDate' ? new Date(endCondition.date) : null;
  
  while (iteration < maxIterations) {
    if (endCondition.type === 'occurrences' && dates.length >= endCondition.count) break;
    if (endDate && currentDate > endDate) break;
    
    dates.push(format(currentDate, 'yyyy-MM-dd'));
    
    // Move to next occurrence
    switch (pattern) {
      case 'weekly': 
        currentDate = addWeeks(currentDate, 1); 
        break;
      case 'biweekly': 
        currentDate = addWeeks(currentDate, 2); 
        break;
      case 'monthly': 
        currentDate = addMonths(currentDate, 1); 
        break;
    }
    iteration++;
  }
  
  return dates;
};

export const eventsService = {
  async createEvent(eventData: Partial<Event>, invitations?: {
    type: 'everyone' | 'players_only' | 'staff_only' | 'pick_squad',
    selectedPlayerIds?: string[],
    selectedStaffIds?: string[]
  }) {
    try {
      logger.log('Creating event with data:', eventData);
      
      // Check if this is a recurring event
      if (eventData.isRecurring && eventData.recurrencePattern && eventData.recurrenceDayOfWeek !== undefined) {
        return await this.createRecurringEvents(eventData, invitations);
      }
      
      const formattedData = {
        team_id: eventData.teamId,
        title: eventData.title,
        description: eventData.description,
        date: eventData.date,
        start_time: eventData.startTime || null,
        end_time: eventData.endTime || null,
        event_type: eventData.type,
        location: eventData.location,
        latitude: eventData.latitude,
        longitude: eventData.longitude,
        game_format: eventData.gameFormat,
        game_duration: eventData.gameDuration,
        opponent: eventData.opponent,
        is_home: eventData.isHome,
        kit_selection: eventData.kitSelection,
        teams: eventData.teams,
        facility_id: eventData.facilityId || null,
        meeting_time: eventData.meetingTime || null,
        notes: eventData.notes,
        training_notes: eventData.trainingNotes
      };
      
      const { data, error } = await supabase
        .from('events')
        .insert(formattedData)
        .select()
        .single();
        
      if (error) throw error;
      
      logger.log('Event created successfully:', data);
      
      // Auto-create event teams based on the teams array
      if (eventData.teams && Array.isArray(eventData.teams) && eventData.teams.length > 0) {
        logger.log('Creating event teams for:', eventData.teams);
        
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
          logger.error('Error creating event teams:', eventTeamsError);
          // Don't throw here as the event was created successfully
        } else {
          logger.log('Event teams created successfully');
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
          logger.error('Error creating default event team:', eventTeamError);
        } else {
          logger.log('Default event team created successfully');
        }
      }
      
      // Create invitations if specified
      if (invitations) {
        logger.log('Creating invitations for event:', data.id, 'with data:', invitations);
        await this.createEventInvitations(data.id, eventData.teamId!, invitations);
      } else {
        logger.log('No invitations data provided');
      }
      
      return data;
    } catch (error) {
      logger.error('Error creating event:', error);
      throw error;
    }
  },

  async createRecurringEvents(eventData: Partial<Event>, invitations?: {
    type: 'everyone' | 'players_only' | 'staff_only' | 'pick_squad',
    selectedPlayerIds?: string[],
    selectedStaffIds?: string[]
  }) {
    const recurringGroupId = crypto.randomUUID();
    
    const endCondition = eventData.recurrenceOccurrences 
      ? { type: 'occurrences' as const, count: eventData.recurrenceOccurrences }
      : { type: 'endDate' as const, date: eventData.recurrenceEndDate! };
    
    const dates = generateRecurringDates(
      eventData.date!,
      eventData.recurrencePattern!,
      eventData.recurrenceDayOfWeek!,
      endCondition
    );
    
    logger.log(`Creating ${dates.length} recurring events`);
    
    const eventsToInsert = dates.map(date => ({
      team_id: eventData.teamId,
      title: eventData.title,
      description: eventData.description,
      date: date,
      start_time: eventData.startTime || null,
      end_time: eventData.endTime || null,
      event_type: eventData.type,
      location: eventData.location,
      game_format: eventData.gameFormat,
      game_duration: eventData.gameDuration,
      opponent: eventData.opponent,
      is_home: eventData.isHome,
      kit_selection: eventData.kitSelection,
      facility_id: eventData.facilityId || null,
      meeting_time: eventData.meetingTime || null,
      notes: eventData.notes,
      is_recurring: true,
      recurrence_pattern: eventData.recurrencePattern,
      recurrence_day_of_week: eventData.recurrenceDayOfWeek,
      recurring_group_id: recurringGroupId,
    }));
    
    const { data, error } = await supabase
      .from('events')
      .insert(eventsToInsert)
      .select();
      
    if (error) throw error;
    
    // Create event teams for each event
    if (data && eventData.teamId) {
      const eventTeams = data.map(event => ({
        event_id: event.id,
        team_id: eventData.teamId,
        team_number: 1,
        start_time: eventData.startTime || null,
        meeting_time: eventData.meetingTime || null
      }));
      
      await supabase.from('event_teams').insert(eventTeams);
    }
    
    // Create invitations for all recurring events in parallel
    if (invitations && data) {
      await Promise.all(
        data.map(event => this.createEventInvitations(event.id, eventData.teamId!, invitations))
      );
    }
    
    return { ...data[0], createdCount: data.length };
  },
  async createEventInvitations(
    eventId: string,
    teamId: string,
    invitations: {
      type: 'everyone' | 'players_only' | 'staff_only' | 'pick_squad',
      selectedPlayerIds?: string[],
      selectedStaffIds?: string[]
    }
  ) {
    try {
      logger.log('Creating event invitations:', invitations);
      
      const invitationRecords: any[] = [];
      
      if (invitations.type === 'everyone' || invitations.type === 'players_only' || invitations.type === 'staff_only') {
        const needPlayers = invitations.type === 'everyone' || invitations.type === 'players_only';
        const needStaff = invitations.type === 'everyone' || invitations.type === 'staff_only';

        // Phase 1: run all independent queries in parallel
        const [playersResult, staffResult, userTeamsStaffResult] = await Promise.all([
          needPlayers
            // @ts-ignore - Supabase type inference causes excessive depth
            ? (supabase.from('players').select('id').eq('team_id', teamId).eq('status', 'active') as Promise<any>)
            : Promise.resolve({ data: [], error: null }),
          needStaff
            // @ts-ignore - Supabase type inference causes excessive depth
            ? (supabase.from('team_staff').select('id').eq('team_id', teamId) as Promise<any>)
            : Promise.resolve({ data: [], error: null }),
          needStaff
            // @ts-ignore - Supabase type inference causes excessive depth
            ? (supabase.from('user_teams').select('user_id, role').eq('team_id', teamId)
                .in('role', ['team_manager', 'team_assistant_manager', 'team_coach', 'manager', 'coach', 'staff', 'helper', 'team_helper']) as Promise<any>)
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (playersResult.error) throw playersResult.error;
        if (staffResult.error) throw staffResult.error;
        if (userTeamsStaffResult.error) throw userTeamsStaffResult.error;

        const players: any[] = playersResult.data || [];
        const staff: any[] = staffResult.data || [];
        const userTeamsStaff: any[] = userTeamsStaffResult.data || [];

        // Phase 2: dependent queries (need player IDs / staff IDs from phase 1)
        const [playerUsersResult, staffUsersResult] = await Promise.all([
          needPlayers && players.length > 0
            ? (supabase.from('user_players').select('user_id, player_id')
                .in('player_id', players.map((p: any) => p.id)) as Promise<any>)
            : Promise.resolve({ data: [], error: null }),
          needStaff && staff.length > 0
            ? (supabase.from('user_staff').select('user_id, staff_id')
                .in('staff_id', staff.map((s: any) => s.id)) as Promise<any>)
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (playerUsersResult.error) throw playerUsersResult.error;
        if (staffUsersResult.error) throw staffUsersResult.error;

        const playerUsers: any[] = playerUsersResult.data || [];
        const staffUsers: any[] = staffUsersResult.data || [];

        if (needPlayers) {
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
          players.forEach((p: any) => {
            if (!mappedPlayerIds.has(p.id)) {
              invitationRecords.push({
                event_id: eventId,
                user_id: null, // no linked user
                invitee_type: 'player',
                player_id: p.id
              });
            }
          });
        }

        if (needStaff) {
          
          // Add user_teams staff to staffUsers (they already have user_id)
          const userTeamsStaffUsers = userTeamsStaff.map((uts: any) => ({
            user_id: uts.user_id,
            staff_id: null // No staff_id for user_teams entries
          }));
          
          // Create invitation records for team_staff (with or without linked users)
          // Track processed user IDs to prevent duplicates
          const processedUserIds = new Set<string>();
          const mappedStaffIds = new Set(staffUsers.map((su: any) => su.staff_id));
          
          staffUsers.forEach((su: any) => {
            invitationRecords.push({
              event_id: eventId,
              user_id: su.user_id,
              invitee_type: 'staff',
              staff_id: su.staff_id
            });
            if (su.user_id) {
              processedUserIds.add(su.user_id);
            }
          });
          staff.forEach((s: any) => {
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
          // Skip users who were already added via team_staff to avoid duplicate key errors
          userTeamsStaffUsers.forEach((su: any) => {
            if (su.user_id && !processedUserIds.has(su.user_id)) {
              invitationRecords.push({
                event_id: eventId,
                user_id: su.user_id,
                invitee_type: 'staff',
                staff_id: null
              });
              processedUserIds.add(su.user_id);
            }
          });
        }
      } else if (invitations.type === 'pick_squad') {
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
          logger.error('Error inserting invitations:', insertError);
          throw insertError;
        }
        
        logger.log(`Created ${invitationRecords.length} invitations for event ${eventId}`);

        // Create event_availability records for users with linked accounts
        const availabilityRecords = invitationRecords
          .filter(inv => inv.user_id) // Only for users with linked accounts
          .map(inv => ({
            event_id: eventId,
            user_id: inv.user_id,
            player_id: inv.invitee_type === 'player' ? (inv.player_id ?? null) : null,
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
            logger.error('Error creating availability records:', availabilityError);
          } else {
            logger.log(`Created ${availabilityRecords.length} availability records for event ${eventId}`);
          }

          // Send invite push notifications immediately
          const userIds = availabilityRecords.map(r => r.user_id);
          await this.sendEventNotifications(eventId, userIds);

          // Schedule day-of reminders (morning + 3-hour) for this event
          supabase.functions.invoke('enhanced-notification-scheduler', {
            body: { action: 'schedule_event_reminders', data: { eventId } }
          }).catch(err => logger.error('Failed to schedule event reminders:', err));
        }
      }
    } catch (error) {
      logger.error('Error creating event invitations:', error);
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
      logger.log('Updating event with data:', eventData);
      
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
      
      logger.log('Event updated successfully:', data);

      // Handle invitations update if provided
      if (invitations) {
        logger.log('Updating invitations for event:', eventData.id, invitations);
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
              player_id: inv.invitee_type === 'player' ? (inv.player_id ?? null) : null,
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
              logger.error('Error creating availability records:', availabilityError);
            }
          }
        }
      }

      // Re-schedule day-of reminders whenever event is updated (date/time may have changed)
      supabase.functions.invoke('enhanced-notification-scheduler', {
        body: { action: 'schedule_event_reminders', data: { eventId: eventData.id } }
      }).catch(err => logger.error('Failed to re-schedule event reminders:', err));

      return data;
    } catch (error) {
      logger.error('Error updating event:', error);
      throw error;
    }
  },
  
  async getEventById(eventId: string) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, date, start_time, end_time, type, event_type, team_id, opponent, location, scores, status, home_score, away_score, kit_selection, coach_notes, staff_notes, training_notes, recurring_group_id, created_at, updated_at')
        .eq('id', eventId)
        .single();
        
      if (error) throw error;
      
      return data;
    } catch (error) {
      logger.error('Error fetching event:', error);
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
      logger.error('Error deleting event:', error);
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
        logger.error('Error fetching event for notification:', eventError);
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

      logger.log('Sending push notifications for event:', eventId, 'to users:', userIds.length);

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
        logger.error('Error sending push notifications:', error);
      } else {
        logger.log('Push notifications sent successfully for event:', eventId);
      }
    } catch (error) {
      logger.error('Error in sendEventNotifications:', error);
      // Don't throw - notifications failing shouldn't break event creation
    }
  }
};
