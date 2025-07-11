
import { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, MapPin, Clock, Users, Trophy, X } from 'lucide-react';
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
  opponent?: string;
  game_format?: string;
  scores?: any;
  start_time?: string;
  end_time?: string;
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
  const [isEventDetailsOpen, setIsEventDetailsOpen] = useState(false);

  const loadUserAvailability = async () => {
    if (!user?.id) {
      console.log('No user ID available for loading availability');
      return;
    }

    try {
      console.log('Loading availability for user:', user.id);

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
        team_id: event.team_id,
        opponent: event.opponent,
        game_format: event.game_format,
        scores: event.scores,
        start_time: event.start_time,
        end_time: event.end_time
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
      case 'pending':
        return 'border-l-blue-500 border-l-4';
      default:
        return 'border-l-gray-300 border-l-4';
    }
  };

  const handleEventClick = (event: DatabaseEvent) => {
    setSelectedEvent(event);
    setIsEventDetailsOpen(true);
  };

  const getStatusBadgeColor = (status: string | null) => {
    switch (status) {
      case 'available':
        return 'bg-green-500 text-white';
      case 'unavailable':
        return 'bg-red-500 text-white';
      case 'maybe':
        return 'bg-yellow-500 text-white';
      case 'pending':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-300 text-gray-700';
    }
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
              const availabilityStatus = getAvailabilityStatus(event.id);
              
              return (
                <Card 
                  key={event.id} 
                  className={`${borderClass} transition-colors cursor-pointer hover:shadow-md bg-white`}
                  onClick={() => handleEventClick(event)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-gray-600">
                            {format(new Date(event.event_date), 'EEE dd MMM').toUpperCase()}
                          </span>
                          <span className="text-lg font-bold">
                            {event.event_time}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold">BU</span>
                          </div>
                          <h3 className="font-semibold text-base">
                            {event.title}
                          </h3>
                        </div>
                        
                        {event.location && (
                          <p className="text-sm text-gray-600">{event.location}</p>
                        )}
                        
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span>{event.type === 'match' ? event.game_format || '7-a-side' : event.type}</span>
                          {event.type === 'match' && <span>• Away</span>}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-1">
                          <Trophy className="h-4 w-4 text-yellow-500" />
                          <X className="h-4 w-4 text-red-500" />
                          <Users className="h-4 w-4 text-gray-400" />
                        </div>
                        
                        {availabilityStatus && (
                          <Badge 
                            className={`text-xs px-2 py-1 ${getStatusBadgeColor(availabilityStatus)}`}
                          >
                            {availabilityStatus === 'available' ? 'Available' :
                             availabilityStatus === 'unavailable' ? 'Unavailable' :
                             availabilityStatus === 'maybe' ? 'Maybe' :
                             availabilityStatus === 'pending' ? 'Pending' :
                             'No response'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        )}

        {/* Event Details Dialog */}
        <Dialog open={isEventDetailsOpen} onOpenChange={setIsEventDetailsOpen}>
          <DialogContent className="max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle>Event Details</DialogTitle>
            </DialogHeader>
            
            {selectedEvent && (
              <div className="space-y-4">
                <Badge variant={selectedEvent.type === 'match' ? 'default' : 'secondary'}>
                  {selectedEvent.type === 'match' ? 'Fixture' : selectedEvent.type}
                </Badge>
                
                <h2 className="text-xl font-bold">{selectedEvent.title}</h2>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-gray-500" />
                    <span>{format(new Date(selectedEvent.event_date), 'EEEE, MMMM do, yyyy')}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-gray-500" />
                    <span>
                      {selectedEvent.start_time || selectedEvent.event_time}
                      {selectedEvent.end_time && ` - ${selectedEvent.end_time}`}
                    </span>
                  </div>
                  
                  {selectedEvent.location && (
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-gray-500" />
                      <span>{selectedEvent.location}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-gray-500" />
                    <span>{selectedEvent.game_format || '7-a-side'} • Away</span>
                  </div>
                </div>
                
                {selectedEvent.scores && (
                  <div className="space-y-3">
                    <h3 className="font-semibold">Scores</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span>Ronaldo A</span>
                        <div className="flex items-center gap-2">
                          <span>10 - 4</span>
                          <Badge className="bg-blue-500 text-white">WIN</Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Messi</span>
                        <div className="flex items-center gap-2">
                          <span>3 - 6</span>
                          <Badge className="bg-red-500 text-white">LOSS</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Team Selection
                    </h3>
                    <Button variant="ghost" size="sm">View Full</Button>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button size="sm">Team 1</Button>
                    <Button variant="outline" size="sm">Team 2</Button>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Team 1</h4>
                      <Button variant="ghost" size="sm">Edit</Button>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>10 players</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>4 periods</span>
                      </div>
                      <span>Ronaldo A</span>
                    </div>
                    
                    <div className="flex gap-4 border-b mb-3">
                      <Button variant="ghost" size="sm" className="border-b-2 border-blue-500">
                        Overview
                      </Button>
                      <Button variant="ghost" size="sm" className="text-gray-500">
                        Periods
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      <h5 className="font-medium">Formation Summary</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Period 1</span>
                          <span>1-2-3-1 • 12min</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Period 2</span>
                          <span>1-2-3-1 • 13min</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Period 3</span>
                          <span>1-2-3-1 • 12min</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
}
