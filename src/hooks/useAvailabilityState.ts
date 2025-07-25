import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
      const { data, error } = await supabase
        .from('event_availability')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', userId);

      if (error) throw error;

      // Update global state with fresh data
      if (data) {
        data.forEach(availability => {
          const key = getAvailabilityKey(eventId, userId, availability.role as 'player' | 'staff');
          globalAvailabilityState.set(key, {
            eventId,
            role: availability.role as 'player' | 'staff',
            status: availability.status as 'pending' | 'available' | 'unavailable',
            userId
          });
        });
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
        .update({ 
          status,
          responded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .eq('role', role);

      if (error) {
        // Revert optimistic update on error
        globalAvailabilityState.delete(key);
        notifySubscribers();
        throw error;
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