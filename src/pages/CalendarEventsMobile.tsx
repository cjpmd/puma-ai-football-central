
// src/pages/CalendarEventsMobile.tsx
import { useState, useEffect } from 'react';
import { format, isSameDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DatabaseEvent } from '@/types/event';
import { AvailabilityButtons } from '@/components/events/AvailabilityButtons';

export default function CalendarEventsMobile() {
  const [events, setEvents] = useState<DatabaseEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [userAvailability, setUserAvailability] = useState<{[eventId: string]: 'pending' | 'available' | 'unavailable' | null}>({});
  const { toast } = useToast();
  const { teams, user } = useAuth();

  useEffect(() => {
    loadEvents();
  }, [teams]);

  useEffect(() => {
    if (events.length > 0 && user?.id) {
      loadUserAvailability();
    }
  }, [events, user?.id]);

  const loadUserAvailability = async () => {
    try {
      if (!user?.id) {
        console.log('No user ID available for availability loading');
        return;
      }

      const availabilityStatuses: {[eventId: string]: 'pending' | 'available' | 'unavailable' | null} = {};
      for (const event of events) {
        const { data, error } = await supabase
          .from('event_availability')
          .select('status')
          .eq('event_id', event.id)
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error loading user availability:', error);
          continue;
        }

        availabilityStatuses[event.id] = (data?.status as 'pending' | 'available' | 'unavailable') || null;
      }
      setUserAvailability(availabilityStatuses);
    } catch (error) {
      console.error('Error in loadUserAvailability:', error);
    }
  };

  const getAvailabilityStatus = (eventId: string): 'pending' | 'available' | 'unavailable' | null => {
    return userAvailability[eventId] || null;
  };

  const handleAvailabilityChange = (eventId: string, newStatus: 'available' | 'unavailable') => {
    setUserAvailability(prev => ({
      ...prev,
      [eventId]: newStatus,
    }));
  };

  const loadEvents = async () => {
    try {
      if (!teams || teams.length === 0) return;

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('team_id', teams[0].id)
        .order('date', { ascending: true });

      if (error) throw error;
      setEvents((data || []) as DatabaseEvent[]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load events',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Calendar & Events</h1>
      <div className="space-y-4">
        {events.map(event => (
          <div key={event.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            {/* Date and Time Header */}
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              {format(new Date(event.date), 'EEE dd MMM')}
            </div>
            <div className="text-lg font-semibold mb-2">
              {event.start_time || '10:00:00'}
            </div>

            {/* Event Details */}
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-900">
                  {event.title}
                </span>
                {event.opponent && (
                  <>
                    <span className="text-gray-500">vs</span>
                    <span className="font-medium text-gray-900">{event.opponent}</span>
                  </>
                )}
              </div>
              
              {event.location && (
                <div className="text-sm text-gray-600">
                  {event.location}
                </div>
              )}
              
              {event.game_format && (
                <div className="text-sm text-gray-600">
                  {event.game_format} • {event.is_home ? 'Home' : 'Away'}
                </div>
              )}
            </div>

            {/* Availability Section */}
            {user?.id && getAvailabilityStatus(event.id) && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <AvailabilityButtons
                  eventId={event.id}
                  currentStatus={getAvailabilityStatus(event.id)}
                  onStatusChange={(newStatus) => handleAvailabilityChange(event.id, newStatus)}
                />
              </div>
            )}
          </div>
        ))}
        
        {events.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No events scheduled</p>
          </div>
        )}
      </div>
    </div>
  );
}
