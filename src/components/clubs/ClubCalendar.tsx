import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Clock, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ClubEvent {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  eventType: string;
  location?: string;
  opponent?: string;
  teamName: string;
  teamId: string;
}

interface ClubCalendarProps {
  clubId: string;
  clubName: string;
}

export const ClubCalendar: React.FC<ClubCalendarProps> = ({
  clubId,
  clubName
}) => {
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (clubId) {
      loadClubEvents();
    }
  }, [clubId]);

  const loadClubEvents = async () => {
    try {
      setLoading(true);
      console.log('Loading events for club:', clubId);

      // Get all teams linked to this club via club_teams table
      const { data: clubTeams, error: clubTeamsError } = await supabase
        .from('club_teams')
        .select(`
          team_id,
          teams!inner(id, name)
        `)
        .eq('club_id', clubId);

      if (clubTeamsError) {
        console.error('Error fetching club teams:', clubTeamsError);
        throw clubTeamsError;
      }

      if (!clubTeams || clubTeams.length === 0) {
        console.log('No teams linked to this club');
        setEvents([]);
        return;
      }

      const teamIds = clubTeams.map(ct => ct.team_id);
      console.log('Team IDs for events:', teamIds);

      // Get all events from linked teams
      const { data: teamEvents, error: eventsError } = await supabase
        .from('events')
        .select(`
          *,
          teams!inner(id, name)
        `)
        .in('team_id', teamIds)
        .gte('date', new Date().toISOString().split('T')[0]) // Only future events
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (eventsError) {
        console.error('Error fetching team events:', eventsError);
        throw eventsError;
      }

      console.log('Team events data:', teamEvents);

      if (teamEvents && teamEvents.length > 0) {
        const clubEvents: ClubEvent[] = teamEvents.map(event => ({
          id: event.id,
          title: event.title,
          date: event.date,
          startTime: event.start_time,
          endTime: event.end_time,
          eventType: event.event_type,
          location: event.location,
          opponent: event.opponent,
          teamName: event.teams?.name || 'Unknown Team',
          teamId: event.team_id
        }));

        console.log('Processed club events:', clubEvents);
        setEvents(clubEvents);
      } else {
        console.log('No events found for club teams');
        setEvents([]);
      }
    } catch (error: any) {
      console.error('Error loading club events:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load club events',
        variant: 'destructive',
      });
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'match': return 'bg-blue-500';
      case 'training': return 'bg-green-500';
      case 'tournament': return 'bg-purple-500';
      case 'friendly': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '';
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading club calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Club Calendar</h3>
          <p className="text-sm text-muted-foreground">
            All upcoming events across teams in {clubName}
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {events.length} upcoming event{events.length !== 1 ? 's' : ''}
        </div>
      </div>

      {events.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-8 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No Upcoming Events</h3>
            <p className="text-muted-foreground mb-4">
              No upcoming events found for teams in this club.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <Card key={event.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-lg">{event.title}</h4>
                        <Badge className={`text-white ${getEventTypeColor(event.eventType)}`}>
                          {event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(event.date)}</span>
                          </div>
                          {(event.startTime || event.endTime) && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>
                                {event.startTime && formatTime(event.startTime)}
                                {event.endTime && ` - ${formatTime(event.endTime)}`}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span className="font-medium">{event.teamName}</span>
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span>{event.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {event.opponent && (
                        <div className="mt-3 p-3 bg-muted rounded-lg">
                          <span className="text-sm font-medium">vs {event.opponent}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
