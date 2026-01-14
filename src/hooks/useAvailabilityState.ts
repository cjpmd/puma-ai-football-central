import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getSharedUserIds, getBestAvailabilityStatus } from '@/services/sharedAvailabilityService';

export interface AvailabilityState {
  eventId: string;
  role: 'player' | 'staff';
  status: 'pending' | 'available' | 'unavailable';
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

  const getAvailabilityKey = (eventId: string, userId: string, role: 'player' | 'staff') => {
    return `${eventId}-${userId}-${role}`;
  };

  const loadAvailabilityForEvent = useCallback(async (eventId: string, userId: string) => {
    try {
      // Get all user IDs that share this player's availability
      const sharedUserIds = await getSharedUserIds(userId);

      // Fetch availability for all shared users
      const { data, error } = await supabase
        .from('event_availability')
        .select('*')
        .eq('event_id', eventId)
        .in('user_id', sharedUserIds);

      if (error) throw error;

      // Group by role and get best status
      if (data && data.length > 0) {
        const playerRecords = data.filter(r => r.role === 'player');
        const staffRecords = data.filter(r => r.role === 'staff');

        if (playerRecords.length > 0) {
          const bestPlayer = getBestAvailabilityStatus(playerRecords);
          const key = getAvailabilityKey(eventId, userId, 'player');
          globalAvailabilityState.set(key, {
            eventId,
            role: 'player',
            status: bestPlayer.status as 'pending' | 'available' | 'unavailable',
            userId
          });
        }

        if (staffRecords.length > 0) {
          const bestStaff = getBestAvailabilityStatus(staffRecords);
          const key = getAvailabilityKey(eventId, userId, 'staff');
          globalAvailabilityState.set(key, {
            eventId,
            role: 'staff',
            status: bestStaff.status as 'pending' | 'available' | 'unavailable',
            userId
          });
        }

        notifySubscribers();
      }
    } catch (error) {
      console.error('Error loading availability for event:', error);
    }
  }, []);

  const updateAvailability = useCallback(async (
    eventId: string,
    userId: string,
    role: 'player' | 'staff',
    status: 'available' | 'unavailable'
  ) => {
    const key = getAvailabilityKey(eventId, userId, role);
    
    // Optimistic update
    globalAvailabilityState.set(key, {
      eventId,
      role,
      status,
      userId
    });
    notifySubscribers();

    try {
      const { error } = await supabase
        .from('event_availability')
        .upsert({
          event_id: eventId,
          user_id: userId,
          role,
          status,
          responded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          notification_sent_at: null
        }, {
          onConflict: 'event_id,user_id,role'
        });

      if (error) {
        // Revert optimistic update on error
        globalAvailabilityState.delete(key);
        notifySubscribers();
        throw error;
      }

      // If marking as unavailable and role is player, remove from squad and formation
      if (status === 'unavailable' && role === 'player') {
        try {
          // Find linked player for this user
          const { data: playerLink } = await supabase
            .from('user_players')
            .select('player_id')
            .eq('user_id', userId)
            .single();
          
          if (playerLink?.player_id) {
            const { data: result, error: rpcError } = await supabase.rpc('remove_unavailable_player_from_event', {
              p_event_id: eventId,
              p_user_id: userId,
              p_player_id: playerLink.player_id
            });

            if (rpcError) {
              console.error('Error removing unavailable player:', rpcError);
            } else {
              console.log('Player removed from squad and formation:', result);
            }
          }
        } catch (cleanupError) {
          console.error('Error in unavailable player cleanup:', cleanupError);
          // Continue - availability update succeeded
        }
      }
    } catch (error) {
      console.error('Error updating availability:', error);
      throw error;
    }
  }, []);

  const getAvailabilityStatus = useCallback((
    eventId: string,
    userId: string,
    role: 'player' | 'staff'
  ): 'pending' | 'available' | 'unavailable' | null => {
    const key = getAvailabilityKey(eventId, userId, role);
    return localState.get(key)?.status || null;
  }, [localState]);

  const getEventAvailability = useCallback((eventId: string, userId: string) => {
    const playerKey = getAvailabilityKey(eventId, userId, 'player');
    const staffKey = getAvailabilityKey(eventId, userId, 'staff');
    
    return {
      player: localState.get(playerKey),
      staff: localState.get(staffKey)
    };
  }, [localState]);

  // Auto-load availability when eventId and user change
  useEffect(() => {
    if (eventId && user?.id) {
      loadAvailabilityForEvent(eventId, user.id);
    }
  }, [eventId, user?.id, loadAvailabilityForEvent]);

  return {
    loadAvailabilityForEvent,
    updateAvailability,
    getAvailabilityStatus,
    getEventAvailability,
    availabilityState: localState
  };
};