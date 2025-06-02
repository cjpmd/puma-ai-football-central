
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Event {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  eventType: string;
  opponent?: string;
  teamId: string;
  teamName: string;
  ageGroup: string;
  isHome?: boolean;
  scores?: any;
}

interface ClubCalendarEventsProps {
  clubId: string;
  clubName: string;
}

export const ClubCalendarEvents: React.FC<ClubCalendarEventsProps> = ({
  clubId,
  clubName
}) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedEventType, setSelectedEventType] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    if (clubId) {
      loadClubEvents();
    }
  }, [clubId]);

  useEffect(() => {
    filterEvents();
  }, [events, selectedTeam, selectedEventType]);

  const loadClubEvents = async () => {
    try {
      setLoading(true);
      console.log('Loading events for club:', clubId);

      // Get all teams linked to this club
      const { data: clubTeams, error: clubTeamsError } = await supabase
        .from('club_teams')
        .select(`
          team_id,
          teams!inner(
            id,
            name,
            age_group
          )
        `)
        .eq('club_id', clubId);

      if (clubTeamsError) throw clubTeamsError;

      if (!clubTeams || clubTeams.length === 0) {
        setEvents([]);
        return;
      }

      const teamIds = clubTeams.map(ct => ct.team_id);

      // Get all events from linked teams
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .in('team_id', teamIds)
        .order('date', { ascending: true });

      if (eventsError) throw eventsError;

      // Transform data to include team information
      const eventsWithTeams = eventsData?.map(event => {
        const teamData = clubTeams.find(ct => ct.team_id === event.team_id)?.teams;
        return {
          ...event,
          teamName: teamData?.name || 'Unknown Team',
          ageGroup: teamData?.age_group || 'Unknown',
          startTime: event.start_time,
          endTime: event.end_time,
          eventType: event.event_type,
          isHome: event.is_home
        };
      }) || [];

      setEvents(eventsWithTeams);
    } catch (error: any) {
      console.error('Error loading club events:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load club events',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterEvents = () => {
    let filtered = events;

    if (selectedTeam !== 'all') {
      filtered = filtered.filter(event => event.teamId === selectedTeam);
    }

    if (selectedEventType !== 'all') {
      filtered = filtered.filter(event => event.eventType === selectedEventType);
    }

    setFilteredEvents(filtered);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
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

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'fixture': return 'bg-blue-500';
      case 'friendly': return 'bg-green-500';
      case 'training': return 'bg-purple-500';
      case 'tournament': return 'bg-orange-500';
      case 'festival': return 'bg-pink-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading club events...</p>
        </div>
      </div>
    );
  }

  const teams = Array.from(new Set(events.map(e => ({ id: e.teamId, name: e.teamName }))))
    .filter((team, index, arr) => arr.findIndex(t => t.id === team.id) === index);

  const eventTypes = Array.from(new Set(events.map(e => e.eventType)));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Calendar & Events - {clubName}</CardTitle>
          <CardDescription>Read-only view of all events from linked teams</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedEventType} onValueChange={setSelectedEventType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {eventTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Events Found</h3>
              <p className="text-muted-foreground">
                {events.length === 0 
                  ? "No teams are linked to this club yet."
                  : "No events match your current filters."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map((event) => (
                <Card key={event.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className={`text-white ${getEventTypeColor(event.eventType)}`}>
                            {event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)}
                          </Badge>
                          <h4 className="font-semibold">{event.title}</h4>
                          {event.opponent && (
                            <span className="text-sm text-muted-foreground">
                              vs {event.opponent} {event.isHome ? '(H)' : '(A)'}
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>{event.teamName} ({event.ageGroup})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(event.date)}</span>
                          </div>
                          {event.startTime && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>
                                {formatTime(event.startTime)}
                                {event.endTime && ` - ${formatTime(event.endTime)}`}
                              </span>
                            </div>
                          )}
                          {event.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span>{event.location}</span>
                            </div>
                          )}
                        </div>

                        {event.scores && (
                          <div className="mt-2">
                            <Badge variant="outline">
                              Score: {event.scores.home || 0} - {event.scores.away || 0}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
