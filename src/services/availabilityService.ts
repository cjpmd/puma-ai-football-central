
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

  async getPlayerAvailabilityFromParents(eventId: string, teamId: string): Promise<any[]> {
    console.log('Getting player availability from parent responses for event:', eventId, 'team:', teamId);
    
    // Get all players in the team
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, name, squad_number, type')
      .eq('team_id', teamId);

    if (playersError) {
      console.error('Error fetching players:', playersError);
      throw playersError;
    }

    if (!players || players.length === 0) {
      console.log('No players found for team:', teamId);
      return [];
    }

    const playerIds = players.map(p => p.id);
    
    // Get user-player relationships for these players
    const { data: userPlayers, error: userPlayersError } = await supabase
      .from('user_players')
      .select('user_id, player_id, relationship')
      .in('player_id', playerIds);

    if (userPlayersError) {
      console.error('Error fetching user-player relationships:', userPlayersError);
      throw userPlayersError;
    }

    if (!userPlayers || userPlayers.length === 0) {
      console.log('No user-player relationships found');
      return [];
    }

    // Get availability for users who have relationships with these players
    const userIds = userPlayers.map(up => up.user_id);
    const { data: availability, error: availabilityError } = await supabase
      .from('event_availability')
      .select('user_id, status, role')
      .eq('event_id', eventId)
      .in('user_id', userIds);

    if (availabilityError) {
      console.error('Error fetching availability:', availabilityError);
      throw availabilityError;
    }

    // Map availability to players
    const playersWithAvailability = players.map(player => {
      // Find user relationships for this player
      const userRelationships = userPlayers.filter(up => up.player_id === player.id);
      
      // Check availability for each relationship
      let playerAvailability = 'pending';
      for (const relationship of userRelationships) {
        const userAvailability = availability?.find(a => a.user_id === relationship.user_id);
        if (userAvailability) {
          // If any parent/user has responded, use that status
          if (userAvailability.status === 'available') {
            playerAvailability = 'available';
            break;
          } else if (userAvailability.status === 'unavailable') {
            playerAvailability = 'unavailable';
          }
        }
      }

      return {
        id: player.id,
        name: player.name,
        squadNumber: player.squad_number,
        type: player.type as 'goalkeeper' | 'outfield',
        availabilityStatus: playerAvailability as 'available' | 'unavailable' | 'pending',
        isAssignedToSquad: false,
        squadRole: 'player' as 'player' | 'captain' | 'vice_captain'
      };
    });

    console.log('Players with availability:', playersWithAvailability);
    return playersWithAvailability;
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
  },

  async getPlayerAvailabilityHistory(playerId: string): Promise<any[]> {
    console.log('Getting availability history for player:', playerId);
    
    // Get user links for this player
    const { data: userPlayers, error: userPlayersError } = await supabase
      .from('user_players')
      .select('user_id, relationship')
      .eq('player_id', playerId);

    if (userPlayersError) {
      console.error('Error fetching user-player relationships:', userPlayersError);
      return [];
    }

    if (!userPlayers || userPlayers.length === 0) {
      console.log('No user-player relationships found for player:', playerId);
      return [];
    }

    const userIds = userPlayers.map(up => up.user_id);

    // Get availability records for these users across all events
    const { data: availability, error: availabilityError } = await supabase
      .from('event_availability')
      .select(`
        *,
        events!inner(id, title, date, event_type, opponent, team_id)
      `)
      .in('user_id', userIds)
      .order('events.date', { ascending: false });

    if (availabilityError) {
      console.error('Error fetching availability history:', availabilityError);
      return [];
    }

    // Process the data to include event details and player info
    const processedAvailability = (availability || []).map(item => ({
      id: item.id,
      eventId: item.event_id,
      eventTitle: item.events?.title,
      eventDate: item.events?.date,
      eventType: item.events?.event_type,
      opponent: item.events?.opponent,
      status: item.status,
      role: item.role,
      respondedAt: item.responded_at,
      relationship: userPlayers.find(up => up.user_id === item.user_id)?.relationship
    }));

    console.log('Found availability history:', processedAvailability.length, 'records');
    return processedAvailability;
  }
};
