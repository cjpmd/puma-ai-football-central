
import { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Clock, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface DatabaseEvent {
  id: string;
  title: string;
  event_date: string;
  event_time: string;
  location: string;
  type: string;
  description?: string;
  team_id: string;
}

interface UserAvailability {
  eventId: string;
  status: string;
}

export default function CalendarEventsMobile() {
  const { user, teams } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<DatabaseEvent[]>([]);
  const [userAvailability, setUserAvailability] = useState<UserAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<DatabaseEvent | null>(null);

  const loadUserAvailability = async () => {
    if (!user?.id) {
      console.log('No user ID available for loading availability');
      return;
    }

    try {
      console.log('Loading availability for user:', user.id);

      // Load availability for this user
      const { data: availabilityData, error } = await supabase
        .from('event_availability')
        .select('event_id, status')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading availability:', error);
        setUserAvailability([]);
        return;
      }

      console.log('Raw availability data from database:', availabilityData);

      const processedAvailability = (availabilityData || []).map(item => ({
        eventId: item.event_id,
        status: item.status
      }));

      console.log('Processed user availability:', processedAvailability);
      setUserAvailability(processedAvailability);

    } catch (error: any) {
      console.error('Error in loadUserAvailability:', error);
      setUserAvailability([]);
    }
  };

  const loadEvents = async () => {
    if (!teams || teams.length === 0) {
      console.log('No teams available, skipping event load');
      setLoading(false);
      return;
    }

    try {
      const teamIds = teams.map(team => team.id);
      console.log('Loading events for teams:', teamIds);
      
      const { data: eventsData, error } = await supabase
        .from('events')
        .select('*')
        .in('team_id', teamIds)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error loading events:', error);
        return;
      }

      console.log('Raw events from database:', eventsData?.length || 0, eventsData);
      
      const mappedEvents = (eventsData || []).map(event => ({
        id: event.id,
        title: event.title,
        event_date: event.date,
        event_time: event.start_time || '00:00',
        location: event.location || '',
        type: event.event_type,
        description: event.description,
        team_id: event.team_id
      }));
      
      console.log('Mapped events:', mappedEvents.length, mappedEvents);
      setEvents(mappedEvents);
    } catch (error) {
      console.error('Error in loadEvents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teams.length > 0) {
      loadEvents();
    }
  }, [teams]);

  useEffect(() => {
    if (user?.id) {
      loadUserAvailability();
    }
  }, [user?.id]);

  const getAvailabilityStatus = (eventId: string) => {
    const availability = userAvailability.find(a => a.eventId === eventId);
    return availability?.status || null;
  };

  const getBorderClass = (eventId: string) => {
    const status = getAvailabilityStatus(eventId);
    
    switch (status) {
      case 'available':
        return 'border-l-green-500 border-l-4';
      case 'unavailable':
        return 'border-l-red-500 border-l-4';
      case 'maybe':
        return 'border-l-yellow-500 border-l-4';
      default:
        return 'border-l-gray-300 border-l-4';
    }
  };

  const handleEventClick = (event: DatabaseEvent) => {
    setSelectedEvent(event);
  };

  const handleCloseEventDetails = () => {
    setSelectedEvent(null);
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Loading events...</p>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (selectedEvent) {
    return (
      <MobileLayout>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={handleCloseEventDetails}>
              ← Back to Events
            </Button>
          </div>
          
          <Card className={getBorderClass(selectedEvent.id)}>
            <CardHeader>
              <CardTitle className="text-xl">{selectedEvent.title}</CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(selectedEvent.event_date), 'EEE, MMM d, yyyy')}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {selectedEvent.event_time}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {selectedEvent.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedEvent.location}</span>
                  </div>
                )}
                
                {selectedEvent.description && (
                  <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Your status:</span>
                    <Badge 
                      variant={getAvailabilityStatus(selectedEvent.id) === 'available' ? 'default' : 'outline'}
                      className={
                        getAvailabilityStatus(selectedEvent.id) === 'available' ? 'bg-green-500' :
                        getAvailabilityStatus(selectedEvent.id) === 'unavailable' ? 'bg-red-500' :
                        getAvailabilityStatus(selectedEvent.id) === 'maybe' ? 'bg-yellow-500' :
                        'bg-gray-300'
                      }
                    >
                      {getAvailabilityStatus(selectedEvent.id) || 'No response'}
                    </Badge>
                  </div>
                </div>

                <Badge variant={selectedEvent.type === 'match' ? 'default' : 'secondary'}>
                  {selectedEvent.type}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">All Events</h1>
          <Badge variant="secondary">{events.length} events</Badge>
        </div>

        {events.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Events</h3>
              <p className="text-muted-foreground">There are no events scheduled for your teams.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const borderClass = getBorderClass(event.id);
              
              return (
                <Card 
                  key={event.id} 
                  className={`${borderClass} transition-colors cursor-pointer hover:shadow-md`}
                  onClick={() => handleEventClick(event)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg leading-tight">{event.title}</CardTitle>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(event.event_date), 'EEE, MMM d')}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {event.event_time}
                          </div>
                        </div>
                      </div>
                      <Badge variant={event.type === 'match' ? 'default' : 'secondary'}>
                        {event.type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {event.location && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{event.location}</span>
                        </div>
                      )}
                      
                      {event.description && (
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Your status:</span>
                          <Badge 
                            variant={getAvailabilityStatus(event.id) === 'available' ? 'default' : 'outline'}
                            className={
                              getAvailabilityStatus(event.id) === 'available' ? 'bg-green-500' :
                              getAvailabilityStatus(event.id) === 'unavailable' ? 'bg-red-500' :
                              getAvailabilityStatus(event.id) === 'maybe' ? 'bg-yellow-500' :
                              'bg-gray-300'
                            }
                          >
                            {getAvailabilityStatus(event.id) || 'No response'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
