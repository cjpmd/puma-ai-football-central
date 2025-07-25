
import { supabase } from '@/integrations/supabase/client';

export interface UserAvailabilityStatus {
  eventId: string;
  status: 'pending' | 'available' | 'unavailable';
  source: 'direct' | 'player_linked';
}

export const userAvailabilityService = {
  async getUserAvailabilityForEvents(userId: string, eventIds?: string[]): Promise<UserAvailabilityStatus[]> {
    console.log('=== USER AVAILABILITY SERVICE DEBUG ===');
    console.log('Loading availability for user:', userId);
    console.log('Event IDs filter:', eventIds);
    
    // Build the query for event availability
    let query = supabase
      .from('event_availability')
      .select('event_id, status')
      .eq('user_id', userId);
    
    if (eventIds && eventIds.length > 0) {
      query = query.in('event_id', eventIds);
    }

    const { data: directAvailability, error } = await query;

    if (error) {
      console.error('Error loading direct user availability:', error);
      throw error;
    }

    console.log('Direct availability records found:', directAvailability?.length || 0);
    console.log('Direct availability data:', directAvailability);

    // Check if user has linked players and get their availability
    const { data: linkedPlayers, error: linkedError } = await supabase
      .from('user_players')
      .select(`
        player_id,
        players!inner(
          id,
          name
        )
      `)
      .eq('user_id', userId);

    if (linkedError) {
      console.error('Error loading linked players:', linkedError);
    } else {
      console.log('Linked players found:', linkedPlayers?.length || 0, linkedPlayers);
    }

    // Now check for player-linked availability if we have linked players
    let playerAvailability: any[] = [];
    if (linkedPlayers && linkedPlayers.length > 0) {
      const playerIds = linkedPlayers.map(lp => lp.player_id);
      console.log('Checking availability for player IDs:', playerIds);
      
      // First, check if the player IDs themselves have availability records
      let playerQuery = supabase
        .from('event_availability')
        .select('event_id, status, user_id')
        .in('user_id', playerIds);
        
      if (eventIds && eventIds.length > 0) {
        playerQuery = playerQuery.in('event_id', eventIds);
      }
      
      const { data: playerAvailabilityData, error: playerError } = await playerQuery;
      
      if (playerError) {
        console.error('Error loading player availability:', playerError);
      } else {
        console.log('Player availability data found:', playerAvailabilityData?.length || 0);
        console.log('Player availability data:', playerAvailabilityData);
        playerAvailability = playerAvailabilityData || [];
      }

      // If no availability found for player IDs, also check if there are availability records 
      // that might reference the player in a different way (like through player selection)
      if (playerAvailability.length === 0) {
        console.log('No direct player availability found, checking all availability records for these events...');
        
        let allAvailabilityQuery = supabase
          .from('event_availability')
          .select('event_id, status, user_id, role');
          
        if (eventIds && eventIds.length > 0) {
          allAvailabilityQuery = allAvailabilityQuery.in('event_id', eventIds);
        }
        
        const { data: allAvailabilityData, error: allAvailabilityError } = await allAvailabilityQuery;
        
        if (!allAvailabilityError && allAvailabilityData) {
          console.log('All availability records for these events:', allAvailabilityData);
          
          // Check if any of these records might be for our linked players
          const potentialPlayerRecords = allAvailabilityData.filter(record => 
            playerIds.includes(record.user_id) || record.role === 'player'
          );
          
          console.log('Potential player records found:', potentialPlayerRecords);
          playerAvailability = potentialPlayerRecords;
        }
      }
    }

    // Combine direct and player availability, prioritizing direct availability
    const availability: UserAvailabilityStatus[] = [];
    const processedEvents = new Set<string>();

    // First, add direct availability
    (directAvailability || []).forEach(item => {
      console.log(`Processing direct availability for event ${item.event_id.slice(-6)}: ${item.status}`);
      availability.push({
        eventId: item.event_id,
        status: item.status as 'pending' | 'available' | 'unavailable',
        source: 'direct'
      });
      processedEvents.add(item.event_id);
    });

    // Then add player availability for events not already processed
    playerAvailability.forEach(item => {
      if (!processedEvents.has(item.event_id)) {
        console.log(`Processing player availability for event ${item.event_id.slice(-6)}: ${item.status}`);
        availability.push({
          eventId: item.event_id,
          status: item.status as 'pending' | 'available' | 'unavailable',
          source: 'player_linked'
        });
        processedEvents.add(item.event_id);
      }
    });

    console.log('Final processed availability statuses:', availability);
    console.log('Event IDs with availability:', availability.map(a => a.eventId.slice(-6)));
    console.log('Event IDs being queried:', eventIds?.map(id => id.slice(-6)));
    console.log('=== END USER AVAILABILITY SERVICE DEBUG ===');
    return availability;
  },

  async updateUserAvailability(
    userId: string,
    eventId: string,
    status: 'available' | 'unavailable'
  ): Promise<void> {
    console.log('Updating availability:', { userId, eventId, status });
    
    const { error } = await supabase.rpc('update_availability_status', {
      p_event_id: eventId,
      p_user_id: userId,
      p_role: 'player', // Default role
      p_status: status
    });

    if (error) {
      console.error('Error updating availability status:', error);
      throw error;
    }
    
    console.log('Availability status updated successfully');
  }
};
