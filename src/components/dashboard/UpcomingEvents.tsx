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
import { EnhancedKitAvatar } from '@/components/shared/EnhancedKitAvatar';

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
  team_context?: {
    name: string;
    logo_url?: string;
    club_name?: string;
    club_logo_url?: string;
  };
  is_home?: boolean;
}

interface UserAvailability {
  eventId: string;
  status: 'pending' | 'available' | 'unavailable';
}

export function UpcomingEvents() {
  const { allTeams, connectedPlayers } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isTeamSelectionOpen, setIsTeamSelectionOpen] = useState(false);
  const [userAvailability, setUserAvailability] = useState<UserAvailability[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (allTeams.length > 0) {
      loadUpcomingEvents();
      loadUserAvailability();
    }
  }, [allTeams]);

  const loadUserAvailability = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: availabilityData, error } = await supabase
        .from('event_availability')
        .select('event_id, status')
        .eq('user_id', user.user.id);

      if (error) {
        console.error('Error loading user availability:', error);
        return;
      }

      const availability = (availabilityData || []).map(item => ({
        eventId: item.event_id,
        status: item.status as 'pending' | 'available' | 'unavailable'
      }));

      setUserAvailability(availability);
    } catch (error) {
      console.error('Error in loadUserAvailability:', error);
    }
  };

  const getAvailabilityStatus = (eventId: string): 'pending' | 'available' | 'unavailable' | null => {
    const availability = userAvailability.find(a => a.eventId === eventId);
    return availability?.status || null;
  };

  const getEventOutlineClass = (eventId: string): string => {
    const status = getAvailabilityStatus(eventId);
    switch (status) {
      case 'available':
        return 'border-l-green-500';
      case 'unavailable':
        return 'border-l-red-500';
      case 'pending':
        return 'border-l-amber-500';
      default:
        return 'border-l-blue-500';
    }
  };

  const loadUpcomingEvents = async () => {
    try {
      const teamIds = allTeams.map(t => t.id);
      const today = new Date().toISOString().split('T')[0];
      
      const { data: eventsData, error } = await supabase
        .from('events')
        .select(`
          id, title, date, start_time, end_time, location, event_type, opponent, scores, team_id, kit_selection, is_home,
          teams!inner(
            id, name, logo_url, kit_designs, club_id,
            clubs!club_id(name, logo_url)
          )
        `)
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
        const team = allTeams.find(t => t.id === event.team_id);
        return {
          ...event,
          team_name: team?.name || event.teams.name,
          team_context: {
            name: event.teams.name,
            logo_url: event.teams.logo_url,
            club_name: event.teams.clubs?.name,
            club_logo_url: event.teams.clubs?.logo_url
          },
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

  const getEventOutcome = (event: Event) => {
    if (!event.scores || !isMatchType(event.event_type)) return null;
    
    const ourScore = event.is_home ? event.scores.home : event.scores.away;
    const opponentScore = event.is_home ? event.scores.away : event.scores.home;
    
    if (ourScore > opponentScore) return { icon: '🏆', outcome: 'win' };
    if (ourScore < opponentScore) return { icon: '❌', outcome: 'loss' };
    return { icon: '🤝', outcome: 'draw' };
  };

  const isMatchType = (eventType: string) => {
    return ['match', 'fixture', 'friendly'].includes(eventType);
  };

  const shouldShowTitle = (event: Event) => {
    return !isMatchType(event.event_type) || !event.opponent;
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
        <Card className={`border-l-4 ${getEventOutlineClass(nextEvent.id)}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Next Event</CardTitle>
                <div className="flex items-center gap-2">
                  {nextEvent.team_context?.logo_url ? (
                    <img 
                      src={nextEvent.team_context.logo_url} 
                      alt={nextEvent.team_context.name}
                      className="w-4 h-4 rounded-full"
                    />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                      {nextEvent.team_context?.name?.slice(0, 2).toUpperCase() || nextEvent.team_name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <CardDescription>
                    {nextEvent.team_context?.name || nextEvent.team_name}
                    {nextEvent.team_context?.club_name && (
                      <span className="text-muted-foreground"> • {nextEvent.team_context.club_name}</span>
                    )}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{nextEvent.event_type}</Badge>
                {(() => {
                  const team = allTeams.find(t => t.name === nextEvent.team_name);
                  const kitDesign = team?.kitDesigns?.[(nextEvent as any).kit_selection as 'home' | 'away' | 'training'];
                  return kitDesign && <EnhancedKitAvatar design={kitDesign} size="sm" />;
                })()}
                {(() => {
                  const outcome = getEventOutcome(nextEvent);
                  return outcome && (
                    <span className="text-lg" title={outcome.outcome}>
                      {outcome.icon}
                    </span>
                  );
                })()}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {shouldShowTitle(nextEvent) ? (
                <h3 className="font-semibold">{nextEvent.title}</h3>
              ) : (
                <div className="flex items-center gap-2">
                  {(() => {
                    const team = allTeams.find(t => t.name === nextEvent.team_name);
                    return team?.logoUrl && (
                      <img 
                        src={team.logoUrl} 
                        alt={team.name}
                        className="w-6 h-6 rounded-full"
                      />
                    );
                  })()}
                  <span className="text-muted-foreground">vs</span>
                  <span className="font-semibold">{nextEvent.opponent}</span>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                {format(new Date(nextEvent.date), 'EEEE, MMMM d, yyyy')}
                {nextEvent.start_time && ` at ${nextEvent.start_time}`}
              </p>
              {nextEvent.location && (
                <p className="text-sm text-muted-foreground">📍 {nextEvent.location}</p>
              )}
              {nextEvent.scores && (
                <p className="text-sm font-medium">
                  Score: {nextEvent.scores.home} - {nextEvent.scores.away}
                </p>
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
        {events.slice(nextEvent ? 1 : 0).map((event) => {
          const team = allTeams.find(t => t.name === event.team_name);
          const kitDesign = team?.kitDesigns?.[(event as any).kit_selection as 'home' | 'away' | 'training'];
          const outcome = getEventOutcome(event);
          
          return (
            <Card key={event.id} className={`hover:shadow-md transition-shadow border-l-4 ${getEventOutlineClass(event.id)}`}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {event.event_type}
                      </Badge>
                      {kitDesign && <EnhancedKitAvatar design={kitDesign} size="xs" />}
                      <div className="flex items-center gap-1">
                        {event.team_context?.logo_url ? (
                          <img 
                            src={event.team_context.logo_url} 
                            alt={event.team_context.name}
                            className="w-3 h-3 rounded-full"
                          />
                        ) : (
                          <div className="w-3 h-3 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                            {event.team_context?.name?.slice(0, 1).toUpperCase() || event.team_name.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {event.team_context?.name || event.team_name}
                        </span>
                      </div>
                      {outcome && (
                        <span className="text-sm" title={outcome.outcome}>
                          {outcome.icon}
                        </span>
                      )}
                    </div>
                    
                    {shouldShowTitle(event) ? (
                      <h3 className="font-medium">{event.title}</h3>
                    ) : (
                      <div className="flex items-center gap-2">
                        {team?.logoUrl && (
                          <img 
                            src={team.logoUrl} 
                            alt={team.name}
                            className="w-4 h-4 rounded-full"
                          />
                        )}
                        <span className="text-xs text-muted-foreground">vs</span>
                        <span className="font-medium">{event.opponent}</span>
                      </div>
                    )}
                    
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(event.date), 'MMM d')}
                      {event.start_time && ` at ${event.start_time}`}
                    </p>
                    {event.location && (
                      <p className="text-xs text-muted-foreground">📍 {event.location}</p>
                    )}
                    {event.scores && (
                      <p className="text-xs font-medium text-muted-foreground">
                        Score: {event.scores.home} - {event.scores.away}
                      </p>
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
          );
        })}
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
              primaryTeamId={allTeams.find(t => t.name === selectedEvent.team_name)?.id || allTeams[0]?.id}
              gameFormat="7-a-side"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
