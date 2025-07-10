
import { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Clock, Users, RefreshCw, Database } from 'lucide-react';
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
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [debugData, setDebugData] = useState<any>({});

  const createTestRecord = async (eventId: string) => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'User not authenticated',
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log('Creating test availability record for event:', eventId, 'user:', user.id);
      
      const { data, error } = await supabase
        .from('event_availability')
        .insert({
          event_id: eventId,
          user_id: user.id,
          status: 'available',
          role: 'player',
          responded_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating test record:', error);
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      console.log('Test record created successfully:', data);
      toast({
        title: 'Success',
        description: 'Test availability record created',
      });

      // Refresh availability data
      loadUserAvailability();
    } catch (error: any) {
      console.error('Error in createTestRecord:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const loadUserAvailability = async () => {
    if (!user?.id) {
      console.log('No user ID available for loading availability');
      setAvailabilityLoading(false);
      return;
    }

    try {
      console.log('Loading availability for user:', user.id);
      setAvailabilityLoading(true);

      // Query all availability data for debugging
      const { data: allAvailabilityData, error: allError } = await supabase
        .from('event_availability')
        .select('*')
        .limit(10);

      if (allError) {
        console.error('Error loading all availability data:', allError);
      } else {
        console.log('All availability data (first 10 rows):', allAvailabilityData);
      }

      // Query user-specific availability data
      const { data: userSpecificData, error: userError } = await supabase
        .from('event_availability')
        .select('*')
        .eq('user_id', user.id);

      if (userError) {
        console.error('Error loading user-specific availability:', userError);
      } else {
        console.log('User-specific availability data:', userSpecificData);
      }

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

      // Update debug data
      setDebugData({
        userId: user.id,
        availabilityCount: availabilityData?.length || 0,
        allAvailabilityCount: allAvailabilityData?.length || 0,
        userSpecificCount: userSpecificData?.length || 0,
        lastUpdated: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Error in loadUserAvailability:', error);
      setUserAvailability([]);
    } finally {
      setAvailabilityLoading(false);
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
      
      // Load all events - no date filtering to match desktop behavior
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
      
      // Map the database events to match the DatabaseEvent interface
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
      
      // Set all events without filtering - matching desktop behavior
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
    console.log(`Availability status for event ${eventId}:`, availability?.status || null, 'from availability array:', userAvailability);
    return availability?.status || null;
  };

  const getBorderClass = (eventId: string) => {
    const status = getAvailabilityStatus(eventId);
    console.log(`Getting border class for event ${eventId}, status:`, status);
    
    switch (status) {
      case 'available':
        console.log('Applying green border (available)');
        return 'border-l-green-500 border-l-4';
      case 'unavailable':
        console.log('Applying red border (unavailable)');
        return 'border-l-red-500 border-l-4';
      case 'maybe':
        console.log('Applying yellow border (maybe)');
        return 'border-l-yellow-500 border-l-4';
      default:
        console.log('Applying gray border (no status)');
        return 'border-l-gray-300 border-l-4';
    }
  };

  const manualRefresh = () => {
    console.log('Manually refreshing availability...');
    loadUserAvailability();
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

  return (
    <MobileLayout>
      <div className="space-y-4">
        {/* Debug Panel */}
        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4" />
              Debug Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-xs space-y-1">
              <p><strong>User ID:</strong> {debugData.userId || 'N/A'}</p>
              <p><strong>User Availability Records:</strong> {debugData.availabilityCount || 0}</p>
              <p><strong>Total Availability Records:</strong> {debugData.allAvailabilityCount || 0}</p>
              <p><strong>Last Updated:</strong> {debugData.lastUpdated ? format(new Date(debugData.lastUpdated), 'HH:mm:ss') : 'N/A'}</p>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={manualRefresh}
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold">Availability per event:</p>
              {events.slice(0, 3).map(event => (
                <div key={event.id} className="flex justify-between items-center text-xs">
                  <span className="truncate">{event.title}</span>
                  <div className="flex gap-1">
                    <Badge variant="outline" className="text-xs">
                      {getAvailabilityStatus(event.id) || 'none'}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => createTestRecord(event.id)}
                      className="text-xs px-2 py-1 h-6"
                    >
                      Test
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

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
              console.log(`Rendering event ${event.id} with border class:`, borderClass);
              
              return (
                <Card key={event.id} className={`${borderClass} transition-colors`}>
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
