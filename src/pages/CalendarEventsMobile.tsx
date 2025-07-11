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
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold tracking-tight mb-4">Calendar & Events</h1>
      {events.map(event => (
        <div key={event.id} className="mb-4 p-4 border rounded-md shadow-sm">
          <h2 className="text-lg font-semibold">{event.title}</h2>
          <p className="text-sm text-muted-foreground">
            {format(new Date(event.date), 'EEEE, MMMM do, yyyy')}
          </p>

          {/* Availability buttons */}
          {user?.id && getAvailabilityStatus(event.id) && (
            <div className="bg-gray-50 p-3 rounded-lg mt-3">
              <h4 className="font-medium mb-2 text-sm">Your Availability</h4>
              <AvailabilityButtons
                eventId={event.id}
                currentStatus={getAvailabilityStatus(event.id)}
                onStatusChange={(newStatus) => handleAvailabilityChange(event.id, newStatus)}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
