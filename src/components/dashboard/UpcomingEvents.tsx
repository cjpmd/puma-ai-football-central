
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { format, isSameDay } from 'date-fns';
import { Calendar, Users, Trophy } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EventTeamsTable } from '@/components/events/EventTeamsTable';

interface Event {
  id: string;
  title: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  event_type: string;
  opponent: string | null;
  scores: { home: number; away: number } | null;
  team_name: string;
}

export function UpcomingEvents() {
  const { teams } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isTeamSelectionOpen, setIsTeamSelectionOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (teams.length > 0) {
      loadUpcomingEvents();
    }
  }, [teams]);

  const loadUpcomingEvents = async () => {
    try {
      const teamIds = teams.map(t => t.id);
      const today = new Date().toISOString().split('T')[0];
      
      const { data: eventsData, error } = await supabase
        .from('events')
        .select('id, title, date, start_time, end_time, location, event_type, opponent, scores, team_id')
        .in('team_id', teamIds)
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(5);

      if (error) {
        console.error('Error loading upcoming events:', error);
        setEvents([]);
        return;
      }

      const eventsWithTeams = (eventsData || []).map(event => {
        const team = teams.find(t => t.id === event.team_id);
        return {
          ...event,
          team_name: team?.name || 'Unknown Team',
          scores: event.scores as { home: number; away: number } | null
        };
      });

      setEvents(eventsWithTeams);
    } catch (error) {
      console.error('Error in loadUpcomingEvents:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewCalendar = () => {
    navigate('/calendar');
  };

  const handleEventDetails = (event: Event) => {
    // Navigate to calendar with the event pre-selected
    navigate('/calendar', { state: { selectedEventId: event.id } });
  };

  const handleManageSquad = (event: Event) => {
    setSelectedEvent(event);
    setIsTeamSelectionOpen(true);
  };

  const getNextEvent = () => {
    return events.length > 0 ? events[0] : null;
  };

  const nextEvent = getNextEvent();

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Upcoming Events</h2>
        <Button size="sm" onClick={handleViewCalendar}>
          <Calendar className="h-4 w-4 mr-2" />
          View All
        </Button>
      </div>

      {nextEvent && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Next Event</CardTitle>
                <CardDescription>{nextEvent.team_name}</CardDescription>
              </div>
              <Badge variant="secondary">{nextEvent.event_type}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h3 className="font-semibold">{nextEvent.title}</h3>
              <p className="text-sm text-muted-foreground">
                {format(new Date(nextEvent.date), 'EEEE, MMMM d, yyyy')}
                {nextEvent.start_time && ` at ${nextEvent.start_time}`}
              </p>
              {nextEvent.location && (
                <p className="text-sm text-muted-foreground">📍 {nextEvent.location}</p>
              )}
              {nextEvent.opponent && (
                <p className="text-sm text-muted-foreground">vs {nextEvent.opponent}</p>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <Button 
                size="sm" 
                onClick={() => handleEventDetails(nextEvent)}
                className="flex-1"
              >
                View Details
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleManageSquad(nextEvent)}
              >
                <Users className="h-4 w-4 mr-1" />
                Manage Squad
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {events.slice(nextEvent ? 1 : 0).map((event) => (
          <Card key={event.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {event.event_type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{event.team_name}</span>
                  </div>
                  <h3 className="font-medium">{event.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(event.date), 'MMM d')}
                    {event.start_time && ` at ${event.start_time}`}
                  </p>
                  {event.location && (
                    <p className="text-xs text-muted-foreground">📍 {event.location}</p>
                  )}
                  {event.opponent && (
                    <p className="text-xs text-muted-foreground">vs {event.opponent}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => handleEventDetails(event)}
                    className="h-8 px-2"
                  >
                    View Details
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => handleManageSquad(event)}
                    className="h-8 px-2"
                  >
                    <Users className="h-3 w-3 mr-1" />
                    Manage Squad
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {events.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No upcoming events</h3>
              <p className="text-muted-foreground mb-4">
                Create your first event to get started with team management.
              </p>
              <Button onClick={handleViewCalendar}>
                Create Event
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Selection Modal */}
      <Dialog open={isTeamSelectionOpen} onOpenChange={setIsTeamSelectionOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Team Selection - {selectedEvent?.title}</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <EventTeamsTable
              eventId={selectedEvent.id}
              primaryTeamId={teams.find(t => t.name === selectedEvent.team_name)?.id || teams[0]?.id}
              gameFormat="7-a-side"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
