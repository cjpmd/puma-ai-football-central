
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Grid3X3, List, Plus, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { EventForm } from '@/components/events/EventForm';
import { EnhancedTeamSelectionManager } from '@/components/events/EnhancedTeamSelectionManager';
import { PostGameEditor } from '@/components/events/PostGameEditor';
import { EventsGridView } from '@/components/events/EventsGridView';
import { CalendarGridView } from '@/components/events/CalendarGridView';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DatabaseEvent } from '@/types/event';
import { GameFormat } from '@/types';
import { eventsService } from '@/services/eventsService';
import { IndividualTrainingService } from '@/services/individualTrainingService';

type ViewMode = 'grid' | 'calendar' | 'list';

export default function CalendarEvents() {
  const [events, setEvents] = useState<DatabaseEvent[]>([]);
  const [individualTrainingSessions, setIndividualTrainingSessions] = useState<any[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<DatabaseEvent[]>([]);
  const [filteredIndividualSessions, setFilteredIndividualSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<DatabaseEvent | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showTeamSelection, setShowTeamSelection] = useState(false);
  const [showPostGameEdit, setShowPostGameEdit] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedEventType, setSelectedEventType] = useState<string>('all');
  const { toast } = useToast();
  const { teams, connectedPlayers } = useAuth();

  useEffect(() => {
    loadEvents();
    loadIndividualTrainingSessions();
  }, [teams, connectedPlayers]);

  useEffect(() => {
    filterEvents();
  }, [events, individualTrainingSessions, selectedTeam, selectedEventType]);

  const loadEvents = async () => {
    try {
      if (!teams || teams.length === 0) return;

      console.log('Loading events for teams:', teams.map(t => ({ id: t.id, name: t.name })));

      const teamIds = teams.map(team => team.id);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .in('team_id', teamIds)
        .order('date', { ascending: true });

      if (error) throw error;
      
      const eventData = (data || []) as DatabaseEvent[];
      console.log('Loaded events:', eventData.length);
      
      // Log current user info for debugging
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user ID:', user?.id);
      console.log('Current user email:', user?.email);
      
      // Check availability for debugging
      if (user?.id && eventData.length > 0) {
        const { data: availabilityData, error: availError } = await supabase
          .from('event_availability')
          .select('event_id, status')
          .eq('user_id', user.id);
          
        console.log('User availability records:', availabilityData);
        if (availError) console.error('Availability error:', availError);
      }
      
      setEvents(eventData);
    } catch (error: any) {
      console.error('Error loading events:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load events',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadIndividualTrainingSessions = async () => {
    try {
      if (!connectedPlayers || connectedPlayers.length === 0) {
        setIndividualTrainingSessions([]);
        return;
      }

      // Get sessions for the current month and next month
      const currentDate = new Date();
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);

      const sessions = await IndividualTrainingService.getCalendarTrainingSessions(
        connectedPlayers.map(p => ({ id: p.id })),
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      console.log('Loaded individual training sessions:', sessions.length);
      setIndividualTrainingSessions(sessions);
    } catch (error: any) {
      console.error('Error loading individual training sessions:', error);
      // Don't show error toast for individual training sessions as they're supplementary
    }
  };

  const filterEvents = () => {
    let filtered = events;

    if (selectedTeam !== 'all') {
      filtered = filtered.filter(event => event.team_id === selectedTeam);
    }

    if (selectedEventType !== 'all') {
      filtered = filtered.filter(event => event.event_type === selectedEventType);
    }

    setFilteredEvents(filtered);
  };

  const handleEditEvent = (event: DatabaseEvent) => {
    setSelectedEvent(event);
    setShowEventForm(true);
  };

  const handleTeamSelection = (event: DatabaseEvent) => {
    setSelectedEvent(event);
    setShowTeamSelection(true);
  };

  const handlePostGameEdit = (event: DatabaseEvent) => {
    setSelectedEvent(event);
    setShowPostGameEdit(true);
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await eventsService.deleteEvent(eventId);
      
      toast({
        title: 'Success',
        description: 'Event deleted successfully',
      });
      
      loadEvents();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete event',
        variant: 'destructive',
      });
    }
  };

  const handleScoreEdit = (event: DatabaseEvent) => {
    setSelectedEvent(event);
    setShowPostGameEdit(true);
  };

  const convertToEventFormat = (dbEvent: DatabaseEvent | null) => {
    if (!dbEvent) return null;
    
    return {
      id: dbEvent.id,
      teamId: dbEvent.team_id,
      title: dbEvent.title,
      description: dbEvent.description,
      date: dbEvent.date,
      startTime: dbEvent.start_time,
      endTime: dbEvent.end_time,
      location: dbEvent.location,
      notes: dbEvent.notes,
      type: dbEvent.event_type as 'training' | 'match' | 'fixture' | 'tournament' | 'festival' | 'social' | 'friendly',
      opponent: dbEvent.opponent,
      isHome: dbEvent.is_home,
      gameFormat: dbEvent.game_format as GameFormat,
      gameDuration: dbEvent.game_duration,
      scores: dbEvent.scores,
      playerOfTheMatchId: dbEvent.player_of_match_id,
      coachNotes: dbEvent.coach_notes,
      staffNotes: dbEvent.staff_notes,
      trainingNotes: dbEvent.training_notes,
      facilityId: dbEvent.facility_id,
      facilityBookingId: dbEvent.facility_booking_id,
      meetingTime: dbEvent.meeting_time,
      totalMinutes: dbEvent.total_minutes,
      teams: dbEvent.teams,
      kitSelection: dbEvent.kit_selection as 'home' | 'away' | 'training',
      createdAt: dbEvent.created_at,
      updatedAt: dbEvent.updated_at,
      latitude: dbEvent.latitude,
      longitude: dbEvent.longitude
    };
  };

  const handleFormSubmit = async (eventData: any) => {
    try {
      setLoading(true);
      
      if (selectedEvent) {
        // Update existing event
        await eventsService.updateEvent({
          id: selectedEvent.id,
          ...eventData,
          team_id: eventData.teamId,
          event_type: eventData.type,
        });
        
        toast({
          title: 'Success',
          description: 'Event updated successfully',
        });
      } else {
        // Create new event
        await eventsService.createEvent({
          ...eventData,
          team_id: eventData.teamId,
          event_type: eventData.type,
        });
        
        toast({
          title: 'Success',
          description: 'Event created successfully',
        });
      }
      
      setShowEventForm(false);
      setSelectedEvent(null);
      loadEvents();
    } catch (error: any) {
      console.error('Error submitting event:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save event',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Loading events...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const eventTypes = Array.from(new Set([...events.map(e => e.event_type), 'individual_training']));

  // Get current month and event counts for header
  const currentMonth = format(new Date(), 'MMMM yyyy');
  const currentMonthEvents = events.filter(event => {
    const eventDate = new Date(event.date);
    const currentDate = new Date();
    return eventDate.getMonth() === currentDate.getMonth() && 
           eventDate.getFullYear() === currentDate.getFullYear();
  });

  // Get next upcoming event
  const upcomingEvents = events.filter(event => new Date(event.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const nextEvent = upcomingEvents[0];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Enhanced Header with Month Display */}
        <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Calendar className="h-7 w-7 text-primary" />
                  Calendar & Events
                </CardTitle>
                <div className="flex items-center gap-4">
                  <h2 className="text-3xl font-bold text-primary">{currentMonth}</h2>
                  <Badge variant="outline" className="text-sm">
                    {currentMonthEvents.length} events this month
                  </Badge>
                </div>
                <CardDescription className="text-base">
                  Manage your team's schedule and events
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setShowEventForm(true)} size="lg">
                  <Plus className="h-5 w-5 mr-2" />
                  Add Event
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              {/* View Mode Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">View:</span>
                <div className="flex rounded-lg border">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-r-none"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('calendar')}
                    className="rounded-none border-x"
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-l-none"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex gap-4 flex-1">
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

                {/* Event Type Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedEventType === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedEventType('all')}
                  >
                    All Types
                  </Button>
                  {eventTypes.map((type) => (
                    <Button
                      key={type}
                      variant={selectedEventType === type ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedEventType(type)}
                    >
                      {type === 'individual_training' ? 'Individual Training' : type.charAt(0).toUpperCase() + type.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Next Event Spotlight & Quick Stats */}
            {nextEvent && (
              <div className="mb-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <h3 className="text-lg font-semibold text-primary mb-2 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Next Event
                </h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{nextEvent.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(nextEvent.date), 'EEEE, MMM dd')} 
                      {nextEvent.start_time && ` at ${nextEvent.start_time}`}
                    </p>
                    {nextEvent.location && (
                      <p className="text-sm text-muted-foreground">📍 {nextEvent.location}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-sm">
                    {Math.ceil((new Date(nextEvent.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                  </Badge>
                </div>
              </div>
            )}

            {/* Event Count */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
                </Badge>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  {upcomingEvents.length} upcoming
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Events Display */}
        {filteredEvents.length === 0 && filteredIndividualSessions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Events Found</h3>
              <p className="text-muted-foreground mb-4">
                {events.length === 0 && individualTrainingSessions.length === 0
                  ? "You haven't created any events yet. Get started by adding your first event!"
                  : "No events match your current filters. Try adjusting your search criteria."
                }
              </p>
              <Button onClick={() => setShowEventForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Event
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {viewMode === 'grid' && (
              <EventsGridView
                events={filteredEvents}
                individualTrainingSessions={filteredIndividualSessions}
                onEditEvent={handleEditEvent}
                onTeamSelection={handleTeamSelection}
                onPostGameEdit={handlePostGameEdit}
                onDeleteEvent={handleDeleteEvent}
                onScoreEdit={handleScoreEdit}
              />
            )}
            
            {viewMode === 'calendar' && (
              <CalendarGridView
                events={filteredEvents}
                individualTrainingSessions={filteredIndividualSessions}
                onEditEvent={handleEditEvent}
                onTeamSelection={handleTeamSelection}
                onPostGameEdit={handlePostGameEdit}
                onDeleteEvent={handleDeleteEvent}
              />
            )}
            
            {viewMode === 'list' && (
              <div className="space-y-6">
                {/* Upcoming Events Section */}
                {upcomingEvents.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold mb-4 text-primary flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Upcoming Events
                    </h3>
                    <div className="space-y-3">
                      {upcomingEvents
                        .filter(event => selectedTeam === 'all' || event.team_id === selectedTeam)
                        .filter(event => selectedEventType === 'all' || event.event_type === selectedEventType)
                        .map((event, index) => {
                          const isNextEvent = index === 0;
                          const team = teams.find(t => t.id === event.team_id);
                          const isMatchType = ['match', 'fixture', 'friendly'].includes(event.event_type);
                          
                          return (
                            <Card key={event.id} className={`${isNextEvent ? 'ring-2 ring-primary shadow-lg bg-primary/5' : ''}`}>
                              <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      {isNextEvent && (
                                        <Badge className="bg-primary text-primary-foreground">Next Event</Badge>
                                      )}
                                      <Badge variant={isMatchType ? "destructive" : "secondary"}>
                                        {event.event_type}
                                      </Badge>
                                      {team?.logoUrl && (
                                        <img src={team.logoUrl} alt={team.name} className="w-6 h-6 rounded-full" />
                                      )}
                                    </div>
                                    
                                    <h3 className={`font-semibold mb-2 ${isNextEvent ? 'text-lg' : ''}`}>
                                      {isMatchType && event.opponent ? (
                                        <span>{team?.name} vs {event.opponent}</span>
                                      ) : (
                                        event.title
                                      )}
                                    </h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                                      <p className="flex items-center gap-1">
                                        <Calendar className="h-4 w-4" />
                                        {format(new Date(event.date), 'EEEE, MMM dd, yyyy')}
                                      </p>
                                      {event.start_time && (
                                        <p className="flex items-center gap-1">
                                          <Clock className="h-4 w-4" />
                                          {event.start_time}
                                        </p>
                                      )}
                                      {event.location && (
                                        <p className="flex items-center gap-1">
                                          📍 {event.location}
                                        </p>
                                      )}
                                    </div>
                                    
                                    {event.description && (
                                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                        {event.description}
                                      </p>
                                    )}
                                  </div>
                                  
                                  <div className="flex flex-col gap-2 ml-4">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEditEvent(event)}
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleTeamSelection(event)}
                                    >
                                      Team
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Past Events Section */}
                {(() => {
                  const pastEvents = events
                    .filter(event => new Date(event.date) < new Date())
                    .filter(event => selectedTeam === 'all' || event.team_id === selectedTeam)
                    .filter(event => selectedEventType === 'all' || event.event_type === selectedEventType)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                  return pastEvents.length > 0 ? (
                    <div>
                      <h3 className="text-xl font-semibold mb-4 text-muted-foreground flex items-center gap-2">
                        Past Events
                      </h3>
                      <div className="space-y-3">
                        {pastEvents.map((event) => {
                          const team = teams.find(t => t.id === event.team_id);
                          const isMatchType = ['match', 'fixture', 'friendly'].includes(event.event_type);
                          
                          return (
                            <Card key={event.id} className="opacity-75">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge variant="outline" className="text-xs">
                                        {event.event_type}
                                      </Badge>
                                      {team?.logoUrl && (
                                        <img src={team.logoUrl} alt={team.name} className="w-4 h-4 rounded-full" />
                                      )}
                                    </div>
                                    <h3 className="font-medium text-sm">
                                      {isMatchType && event.opponent ? (
                                        <span>{team?.name} vs {event.opponent}</span>
                                      ) : (
                                        event.title
                                      )}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                      {format(new Date(event.date), 'MMM dd, yyyy')}
                                      {event.start_time && ` at ${event.start_time}`}
                                    </p>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditEvent(event)}
                                    >
                                      Edit
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </>
        )}

        {/* Event Form Modal */}
        <Dialog open={showEventForm} onOpenChange={setShowEventForm}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedEvent ? 'Edit Event' : 'Create New Event'}
              </DialogTitle>
            </DialogHeader>
            <EventForm
              event={convertToEventFormat(selectedEvent)}
              teamId={selectedTeam !== 'all' ? selectedTeam : teams?.[0]?.id || ''}
              onSubmit={handleFormSubmit}
              onEventCreated={(eventId) => {
                setShowEventForm(false);
                setSelectedEvent(null);
                loadEvents();
              }}
              onCancel={() => {
                setShowEventForm(false);
                setSelectedEvent(null);
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Team Selection Modal */}
        {selectedEvent && (
          <EnhancedTeamSelectionManager
            event={selectedEvent}
            isOpen={showTeamSelection}
            onClose={() => {
              setShowTeamSelection(false);
              setSelectedEvent(null);
            }}
          />
        )}

        {/* Post Game Edit Modal - Made Full Screen */}
        <Dialog open={showPostGameEdit} onOpenChange={setShowPostGameEdit}>
          <DialogContent className="max-w-4xl w-[95vw] max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Post-Game Report</DialogTitle>
            </DialogHeader>
            {selectedEvent && (
              <PostGameEditor
                eventId={selectedEvent.id}
                isOpen={showPostGameEdit}
                onClose={() => {
                  setShowPostGameEdit(false);
                  setSelectedEvent(null);
                  loadEvents();
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
