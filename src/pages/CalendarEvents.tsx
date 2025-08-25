
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Grid3X3, List, Plus } from 'lucide-react';
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Calendar & Events
                </CardTitle>
                <CardDescription>
                  Manage your team's schedule and events
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setShowEventForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
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

                <Select value={selectedEventType} onValueChange={setSelectedEventType}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {eventTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type === 'individual_training' ? 'Individual Training' : type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Event Count */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
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
              <div className="space-y-4">
                {filteredEvents.map((event) => (
                  <Card key={event.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{event.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(event.date).toLocaleDateString()} 
                            {event.start_time && ` at ${event.start_time}`}
                          </p>
                          {event.location && (
                            <p className="text-sm text-muted-foreground">{event.location}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
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
                ))}
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
