import { supabase } from '@/integrations/supabase/client';

export interface UserAvailabilityStatus {
  eventId: string;
  status: 'pending' | 'available' | 'unavailable';
  source: 'player' | 'staff';
  playerId?: string;
}

export const userAvailabilityService = {
  async getUserAvailabilityForEvents(userId: string, eventIds?: string[]): Promise<UserAvailabilityStatus[]> {
    console.log('=== USER AVAILABILITY SERVICE DEBUG ===');
    console.log('Loading availability for user:', userId);
    console.log('Event IDs filter:', eventIds);
    
    // Get the player ID linked to this user
    const { data: userPlayer } = await supabase
      .from('user_players')
      .select('player_id')
      .eq('user_id', userId)
      .maybeSingle();

    const playerId = userPlayer?.player_id;
    console.log('Linked player ID:', playerId);

    const availability: UserAvailabilityStatus[] = [];

    // Fetch player availability (by player_id - shared across linked users)
    if (playerId) {
      let playerQuery = supabase
        .from('event_availability')
        .select('event_id, status, player_id')
        .eq('player_id', playerId)
        .eq('role', 'player');
      
      if (eventIds && eventIds.length > 0) {
        playerQuery = playerQuery.in('event_id', eventIds);
      }

      const { data: playerAvailability, error: playerError } = await playerQuery;

      if (playerError) {
        console.error('Error loading player availability:', playerError);
      } else {
        (playerAvailability || []).forEach(item => {
          availability.push({
            eventId: item.event_id,
            status: item.status as 'pending' | 'available' | 'unavailable',
            source: 'player',
            playerId: item.player_id
          });
        });
      }
    }

    // Fetch staff availability (by user_id - not shared)
    let staffQuery = supabase
      .from('event_availability')
      .select('event_id, status')
      .eq('user_id', userId)
      .eq('role', 'staff');
    
    if (eventIds && eventIds.length > 0) {
      staffQuery = staffQuery.in('event_id', eventIds);
    }

    const { data: staffAvailability, error: staffError } = await staffQuery;

    if (staffError) {
      console.error('Error loading staff availability:', staffError);
    } else {
      (staffAvailability || []).forEach(item => {
        availability.push({
          eventId: item.event_id,
          status: item.status as 'pending' | 'available' | 'unavailable',
          source: 'staff'
        });
      });
    }

    console.log('Final processed availability statuses:', availability);
    console.log('=== END USER AVAILABILITY SERVICE DEBUG ===');
    return availability;
  },

  async updateUserAvailability(
    userId: string,
    eventId: string,
    status: 'available' | 'unavailable',
    role: 'player' | 'staff' = 'player'
  ): Promise<void> {
    console.log('Updating availability:', { userId, eventId, status, role });
    
    if (role === 'player') {
      // Get the linked player ID
      const { data: userPlayer } = await supabase
        .from('user_players')
        .select('player_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!userPlayer?.player_id) {
        throw new Error('No linked player found for user');
      }

      // Check if a record exists for this player
      const { data: existing } = await supabase
        .from('event_availability')
        .select('id')
        .eq('event_id', eventId)
        .eq('player_id', userPlayer.player_id)
        .eq('role', 'player')
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('event_availability')
          .update({
            status,
            last_updated_by: userId,
            responded_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from('event_availability')
          .insert({
            event_id: eventId,
            user_id: userId,
            player_id: userPlayer.player_id,
            role: 'player',
            status,
            last_updated_by: userId,
            responded_at: new Date().toISOString()
          });

        if (error) throw error;
      }
    } else {
      // Staff availability - use upsert on user_id
      const { error } = await supabase
        .from('event_availability')
        .upsert({
          event_id: eventId,
          user_id: userId,
          role: 'staff',
          status,
          last_updated_by: userId,
          responded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'event_id,user_id,role'
        });

      if (error) throw error;
    }
    
    console.log('Availability status updated successfully');
  }
};
