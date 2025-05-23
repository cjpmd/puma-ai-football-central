
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, MapPin, Clock, Users } from 'lucide-react';

interface UpcomingEvent {
  id: string;
  title: string;
  event_type: string;
  date: string;
  start_time: string;
  location: string;
  game_format?: string;
  opponent?: string;
  is_home?: boolean;
  team_name: string;
  attendee_count: number;
  total_players: number;
}

export function UpcomingEvents() {
  const { teams } = useAuth();
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (teams.length > 0) {
      loadUpcomingEvents();
    }
  }, [teams]);

  const loadUpcomingEvents = async () => {
    try {
      const teamIds = teams.map(t => t.id);
      const today = new Date().toISOString().split('T')[0];
      
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select(`
          id,
          title,
          event_type,
          date,
          start_time,
          location,
          game_format,
          opponent,
          is_home,
          teams:team_id (
            name
          )
        `)
        .in('team_id', teamIds)
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(5);

      if (eventsError) {
        console.error('Error loading events:', eventsError);
        setEvents([]);
        return;
      }

      // Get attendee counts for each event
      const eventsWithCounts = await Promise.all(
        (eventsData || []).map(async (event) => {
          // Get confirmed attendees count
          const { count: attendeeCount } = await supabase
            .from('event_attendees')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id)
            .eq('status', 'accepted');

          // Get total team players count
          const { count: totalPlayers } = await supabase
            .from('players')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', event.teams?.id)
            .eq('status', 'active');

          return {
            ...event,
            team_name: event.teams?.name || 'Unknown Team',
            attendee_count: attendeeCount || 0,
            total_players: totalPlayers || 0
          };
        })
      );

      setEvents(eventsWithCounts);
    } catch (error) {
      console.error('Error in loadUpcomingEvents:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "fixture":
        return "bg-red-500 text-white";
      case "friendly":
        return "bg-blue-500 text-white";
      case "tournament":
        return "bg-purple-500 text-white";
      case "festival":
        return "bg-yellow-500 text-white";
      case "training":
        return "bg-green-500 text-white";
      case "social":
        return "bg-pink-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Upcoming Events</h2>
        </div>
        <div className="text-center py-8">Loading events...</div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Upcoming Events</h2>
          <Button size="sm" onClick={() => window.location.href = '/calendar'}>
            View All
          </Button>
        </div>
        <Card className="border-dashed border-2 border-muted">
          <CardContent className="py-8 flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-muted p-3 mb-4">
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">No Upcoming Events</h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              Create your first event to get started with team management.
            </p>
            <Button onClick={() => window.location.href = '/calendar'}>
              Create Event
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Upcoming Events</h2>
        <Button size="sm" onClick={() => window.location.href = '/calendar'}>
          View All
        </Button>
      </div>
      
      <div className="grid gap-4">
        {events.map((event) => (
          <Card key={event.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{event.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    {formatDate(event.date)} • {formatTime(event.start_time)}
                  </CardDescription>
                </div>
                <Badge className={getEventTypeColor(event.event_type)}>
                  {event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Team</p>
                  <p className="text-sm">{event.team_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Location</p>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <p className="text-sm">{event.location}</p>
                  </div>
                </div>
                {event.game_format && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Format</p>
                    <p className="text-sm">{event.game_format}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Attendance</p>
                  <div className="flex items-center mt-1">
                    <div className="flex -space-x-2">
                      {Array.from({ length: Math.min(3, event.attendee_count) }).map((_, i) => (
                        <Avatar key={i} className="h-6 w-6 border-2 border-white">
                          <AvatarFallback className="text-[10px] bg-puma-blue-100 text-puma-blue-500">
                            {String.fromCharCode(65 + i)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <span className="ml-2 text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {event.attendee_count}/{event.total_players} confirmed
                    </span>
                  </div>
                </div>
                {event.opponent && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Opponent</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">vs {event.opponent}</span>
                      <Badge variant={event.is_home ? 'default' : 'secondary'}>
                        {event.is_home ? 'Home' : 'Away'}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4 flex justify-between">
              <Button variant="outline" size="sm">
                Manage Squad
              </Button>
              <Button size="sm" onClick={() => window.location.href = '/calendar'}>
                View Details
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
