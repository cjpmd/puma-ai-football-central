import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AvailabilityState {
  eventId: string;
  role: 'player' | 'staff';
  status: 'pending' | 'available' | 'unavailable';
  playerId?: string; // For player-based availability
  userId: string;
}

// Global state for availability to persist across component mounts/unmounts
const globalAvailabilityState = new Map<string, AvailabilityState>();
const subscribers = new Set<(state: Map<string, AvailabilityState>) => void>();

const notifySubscribers = () => {
  subscribers.forEach(callback => callback(new Map(globalAvailabilityState)));
};

export const useAvailabilityState = (eventId?: string) => {
  const [localState, setLocalState] = useState<Map<string, AvailabilityState>>(new Map(globalAvailabilityState));
  const { user } = useAuth();

  // Subscribe to global state changes
  useEffect(() => {
    const updateLocalState = (newState: Map<string, AvailabilityState>) => {
      setLocalState(newState);
    };
    
    subscribers.add(updateLocalState);
    return () => {
      subscribers.delete(updateLocalState);
    };
  }, []);

  // Get the player ID for the current user
  const getLinkedPlayerId = useCallback(async (userId: string): Promise<string | null> => {
    const { data } = await supabase
      .from('user_players')
      .select('player_id')
      .eq('user_id', userId)
      .maybeSingle();
    return data?.player_id || null;
  }, []);

  const getAvailabilityKey = (eventId: string, role: 'player' | 'staff', playerId?: string) => {
    // For player role, key by player_id if available
    if (role === 'player' && playerId) {
      return `${eventId}-player-${playerId}`;
    }
    // For staff or when no player_id, key by event-role (will be refined later)
    return `${eventId}-${role}`;
  };

  const loadAvailabilityForEvent = useCallback(async (eventId: string, userId: string) => {
    try {
      console.log('=== LOADING PLAYER-BASED AVAILABILITY ===');
      console.log('User ID:', userId, 'Event ID:', eventId);

      // Get linked player ID for this user
      const playerId = await getLinkedPlayerId(userId);
      console.log('Linked player ID:', playerId);

      // For player availability, fetch by player_id (shared across all linked users)
      if (playerId) {
        const { data: playerAvailability, error: playerError } = await supabase
          .from('event_availability')
          .select('*')
          .eq('event_id', eventId)
          .eq('player_id', playerId)
          .eq('role', 'player')
          .maybeSingle();

        if (playerError) {
          console.error('Error fetching player availability:', playerError);
        } else if (playerAvailability) {
          const key = getAvailabilityKey(eventId, 'player', playerId);
          globalAvailabilityState.set(key, {
            eventId,
            role: 'player',
            status: playerAvailability.status as 'pending' | 'available' | 'unavailable',
            playerId,
            userId: playerAvailability.user_id
          });
          console.log('Set player availability:', key, playerAvailability.status);
        }
      }

      // For staff availability, fetch by user_id (staff don't share availability)
      const { data: staffAvailability, error: staffError } = await supabase
        .from('event_availability')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .eq('role', 'staff')
        .maybeSingle();

      if (staffError) {
        console.error('Error fetching staff availability:', staffError);
      } else if (staffAvailability) {
        const key = getAvailabilityKey(eventId, 'staff');
        globalAvailabilityState.set(key, {
          eventId,
          role: 'staff',
          status: staffAvailability.status as 'pending' | 'available' | 'unavailable',
          userId
        });
        console.log('Set staff availability:', key, staffAvailability.status);
      }

      notifySubscribers();
      console.log('=== AVAILABILITY LOADED ===');
    } catch (error) {
      console.error('Error loading availability for event:', error);
    }
  }, [getLinkedPlayerId]);

  const updateAvailability = useCallback(async (
    eventId: string,
    userId: string,
    role: 'player' | 'staff',
    status: 'available' | 'unavailable'
  ) => {
    try {
      console.log('=== UPDATING AVAILABILITY ===');
      console.log('Event:', eventId, 'User:', userId, 'Role:', role, 'Status:', status);

      if (role === 'player') {
        // Get the linked player ID
        const playerId = await getLinkedPlayerId(userId);
        
        if (!playerId) {
          throw new Error('No linked player found for user');
        }

        const key = getAvailabilityKey(eventId, 'player', playerId);
        
        // Optimistic update
        globalAvailabilityState.set(key, {
          eventId,
          role: 'player',
          status,
          playerId,
          userId
        });
        notifySubscribers();

        // Check if a record exists for this player
        const { data: existing } = await supabase
          .from('event_availability')
          .select('id, user_id')
          .eq('event_id', eventId)
          .eq('player_id', playerId)
          .eq('role', 'player')
          .maybeSingle();

        if (existing) {
          // Update existing player-based record
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
          console.log('Updated existing player availability record');
        } else {
          // Create new player-based record
          const { error } = await supabase
            .from('event_availability')
            .insert({
              event_id: eventId,
              user_id: userId,
              player_id: playerId,
              role: 'player',
              status,
              last_updated_by: userId,
              responded_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (error) throw error;
          console.log('Created new player availability record');
        }

        // If marking as unavailable, remove from squad and formation
        if (status === 'unavailable') {
          try {
            const { data: result, error: rpcError } = await supabase.rpc('remove_unavailable_player_from_event', {
              p_event_id: eventId,
              p_user_id: userId,
              p_player_id: playerId
            });

            if (rpcError) {
              console.error('Error removing unavailable player:', rpcError);
            } else {
              console.log('Player removed from squad and formation:', result);
            }
          } catch (cleanupError) {
            console.error('Error in unavailable player cleanup:', cleanupError);
          }
        }
      } else {
        // Staff availability - user-based (unchanged logic)
        const key = getAvailabilityKey(eventId, 'staff');
        
        // Optimistic update
        globalAvailabilityState.set(key, {
          eventId,
          role: 'staff',
          status,
          userId
        });
        notifySubscribers();

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
        console.log('Updated staff availability');
      }

      console.log('=== AVAILABILITY UPDATED SUCCESSFULLY ===');
    } catch (error) {
      console.error('Error updating availability:', error);
      throw error;
    }
  }, [getLinkedPlayerId]);

  const getAvailabilityStatus = useCallback(async (
    eventId: string,
    userId: string,
    role: 'player' | 'staff'
  ): Promise<'pending' | 'available' | 'unavailable' | null> => {
    if (role === 'player') {
      const playerId = await getLinkedPlayerId(userId);
      if (playerId) {
        const key = getAvailabilityKey(eventId, 'player', playerId);
        return localState.get(key)?.status || null;
      }
    }
    
    const key = getAvailabilityKey(eventId, role);
    return localState.get(key)?.status || null;
  }, [localState, getLinkedPlayerId]);

  // Sync version that uses cached player ID
  const getAvailabilityStatusSync = useCallback((
    eventId: string,
    role: 'player' | 'staff',
    playerId?: string
  ): 'pending' | 'available' | 'unavailable' | null => {
    const key = getAvailabilityKey(eventId, role, playerId);
    return localState.get(key)?.status || null;
  }, [localState]);

  const getEventAvailability = useCallback(async (eventId: string, userId: string) => {
    const playerId = await getLinkedPlayerId(userId);
    const playerKey = getAvailabilityKey(eventId, 'player', playerId || undefined);
    const staffKey = getAvailabilityKey(eventId, 'staff');
    
    return {
      player: localState.get(playerKey),
      staff: localState.get(staffKey)
    };
  }, [localState, getLinkedPlayerId]);

  // Auto-load availability when eventId and user change
  useEffect(() => {
    if (eventId && user?.id) {
      loadAvailabilityForEvent(eventId, user.id);
    }
  }, [eventId, user?.id, loadAvailabilityForEvent]);

  // Set up real-time subscription for player availability changes
  useEffect(() => {
    if (!eventId || !user?.id) return;

    const setupRealtimeSubscription = async () => {
      const playerId = await getLinkedPlayerId(user.id);
      
      if (playerId) {
        const channel = supabase
          .channel(`availability-${eventId}-${playerId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'event_availability',
              filter: `event_id=eq.${eventId}`
            },
            (payload) => {
              console.log('Real-time availability update:', payload);
              // Reload availability when any change happens
              loadAvailabilityForEvent(eventId, user.id);
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    };

    const cleanup = setupRealtimeSubscription();
    return () => {
      cleanup.then(unsubscribe => unsubscribe?.());
    };
  }, [eventId, user?.id, getLinkedPlayerId, loadAvailabilityForEvent]);

  return {
    loadAvailabilityForEvent,
    updateAvailability,
    getAvailabilityStatus,
    getAvailabilityStatusSync,
    getEventAvailability,
    availabilityState: localState,
    getLinkedPlayerId
  };
};
