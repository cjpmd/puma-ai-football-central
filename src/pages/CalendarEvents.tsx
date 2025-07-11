
import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CalendarGridView } from '@/components/events/CalendarGridView';
import { EventsGridView } from '@/components/events/EventsGridView';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Grid, Plus } from 'lucide-react';
import { format, isSameDay, isToday, isPast, parseISO, startOfDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { EnhancedTeamSelectionManager } from '@/components/events/EnhancedTeamSelectionManager';
import { EventForm } from '@/components/events/EventForm';
import { PostGameEditor } from '@/components/events/PostGameEditor';
import { DatabaseEvent } from '@/types/event';
import { GameFormat } from '@/types';
import { EnhancedKitAvatar } from '@/components/shared/EnhancedKitAvatar';
import { AvailabilityStatusBadge } from '@/components/events/AvailabilityStatusBadge';
import { userAvailabilityService, UserAvailabilityStatus } from '@/services/userAvailabilityService';
import { AvailabilityButtons } from '@/components/events/AvailabilityButtons';

export default function CalendarEvents() {
  const [events, setEvents] = useState<DatabaseEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<DatabaseEvent | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showTeamSelection, setShowTeamSelection] = useState(false);
  const [showPostGameEdit, setShowPostGameEdit] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [eventSelections, setEventSelections] = useState<{[key: string]: any[]}>({});
  const [userAvailability, setUserAvailability] = useState<UserAvailabilityStatus[]>([]);
  const [activeView, setActiveView] = useState<'calendar' | 'grid'>('calendar');
  const { toast } = useToast();
  const { teams, user } = useAuth();

  useEffect(() => {
    loadEvents();
  }, [teams]);

  useEffect(() => {
    if (events.length > 0 && user?.id) {
      loadUserAvailability();
    }
  }, [events, user?.id]);

  const loadUserAvailability = async () => {
    try {
      if (!user?.id) {
        console.log('No user ID available for availability loading');
        return;
      }

      const eventIds = events.map(event => event.id);
      const availability = await userAvailabilityService.getUserAvailabilityForEvents(user.id, eventIds);
      setUserAvailability(availability);
    } catch (error) {
      console.error('Error in loadUserAvailability:', error);
    }
  };

  const getAvailabilityStatus = (eventId: string): 'pending' | 'available' | 'unavailable' | null => {
    const availability = userAvailability.find(a => a.eventId === eventId);
    const status = availability?.status || null;
    return status;
  };

  const handleAvailabilityChange = (eventId: string, newStatus: 'available' | 'unavailable') => {
    setUserAvailability(prev => 
      prev.map(item => 
        item.eventId === eventId 
          ? { ...item, status: newStatus }
          : item
      )
    );
  };

  const loadEvents = async () => {
    try {
      if (!teams || teams.length === 0) return;

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('team_id', teams[0].id)
        .order('date', { ascending: true });

      if (error) throw error;
      console.log('Loaded events:', data?.length);
      setEvents((data || []) as DatabaseEvent[]);
      
      // Load event selections to get proper performance category mappings
      const { data: selectionsData, error: selectionsError } = await supabase
        .from('event_selections')
        .select(`
          event_id,
          team_number,
          performance_category_id,
          performance_categories!inner(name)
        `)
        .eq('team_id', teams[0].id);

      if (selectionsError) throw selectionsError;
      
      // Group selections by event_id for easy lookup
      const selectionsByEvent: {[key: string]: any[]} = {};
      selectionsData?.forEach(selection => {
        if (!selectionsByEvent[selection.event_id]) {
          selectionsByEvent[selection.event_id] = [];
        }
        selectionsByEvent[selection.event_id].push(selection);
      });
      setEventSelections(selectionsByEvent);

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load events',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setShowEventForm(true);
  };

  const handleEventClick = (event: DatabaseEvent) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
  };

  const handleEventAction = (event: DatabaseEvent, action: 'setup' | 'squad' | 'report') => {
    setSelectedEvent(event);
    
    switch (action) {
      case 'setup':
        setShowEventDetails(false);
        setShowEventForm(true);
        break;
      case 'squad':
        setShowEventDetails(false);
        setShowTeamSelection(true);
        break;
      case 'report':  
        setShowEventDetails(false);
        setShowPostGameEdit(true);
        break;
    }
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
      playerOfMatchId: dbEvent.player_of_match_id,
      coachNotes: dbEvent.coach_notes,
      staffNotes: dbEvent.staff_notes,
      trainingNotes: dbEvent.training_notes,
      facilityId: dbEvent.facility_id,
      facilityBookingId: dbEvent.facility_booking_id,
      meetingTime: dbEvent.meeting_time,
      totalMinutes: dbEvent.total_minutes,
      teams: dbEvent.teams,
      kitSelection: dbEvent.kit_selection as 'home' | 'away' | 'training',
      latitude: dbEvent.latitude,
      longitude: dbEvent.longitude,
      createdAt: dbEvent.created_at,
      updatedAt: dbEvent.updated_at
    };
  };

  const isMatchType = (eventType: string) => {
    return ['match', 'fixture', 'friendly'].includes(eventType);
  };

  const isEventCompleted = (event: DatabaseEvent) => {
    const today = new Date();
    const eventDate = new Date(event.date);
    
    if (eventDate < today) return true;
    
    if (isSameDay(eventDate, today) && event.end_time) {
      const [hours, minutes] = event.end_time.split(':').map(Number);
      const eventEndTime = new Date();
      eventEndTime.setHours(hours, minutes, 0, 0);
      return new Date() > eventEndTime;
    }
    
    return false;
  };

  const shouldShowTitle = (event: DatabaseEvent) => {
    return !isMatchType(event.event_type) || !event.opponent;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading events...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Calendar & Events</h1>
            <p className="text-muted-foreground">
              Manage your team's schedule and events
            </p>
          </div>
          <Button onClick={handleCreateEvent}>
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        </div>

        <Tabs value={activeView} onValueChange={(value) => setActiveView(value as 'calendar' | 'grid')}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendar View
            </TabsTrigger>
            <TabsTrigger value="grid" className="flex items-center gap-2">
              <Grid className="h-4 w-4" />
              List View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="mt-6">
            <CalendarGridView 
              events={events} 
              onEventClick={handleEventClick}
              userAvailability={userAvailability}
              onAvailabilityChange={handleAvailabilityChange}
            />
          </TabsContent>

          <TabsContent value="grid" className="mt-6">
            <EventsGridView 
              events={events} 
              onEventClick={handleEventClick}
              onEventAction={handleEventAction}
              eventSelections={eventSelections}
              userAvailability={userAvailability}
              onAvailabilityChange={handleAvailabilityChange}
            />
          </TabsContent>
        </Tabs>

        {/* Event Details Modal */}
        <Dialog open={showEventDetails} onOpenChange={setShowEventDetails}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Event Details</DialogTitle>
            </DialogHeader>
            {selectedEvent && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge className="bg-blue-500 text-white">
                    {selectedEvent.event_type.charAt(0).toUpperCase() + selectedEvent.event_type.slice(1)}
                  </Badge>
                  {getAvailabilityStatus(selectedEvent.id) && (
                    <AvailabilityStatusBadge status={getAvailabilityStatus(selectedEvent.id)!} size="md" />
                  )}
                </div>
                
                <div>
                  <h3 className="font-semibold text-lg">
                    {shouldShowTitle(selectedEvent) 
                      ? selectedEvent.title
                      : `${teams?.[0]?.name} vs ${selectedEvent.opponent}`
                    }
                  </h3>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>{format(new Date(selectedEvent.date), 'EEEE, MMMM do, yyyy')}</span>
                  </div>
                  
                  {selectedEvent.start_time && (
                    <div className="flex items-center gap-2 text-sm">
                      <span>
                        {selectedEvent.start_time}
                        {selectedEvent.end_time && ` - ${selectedEvent.end_time}`}
                      </span>
                    </div>
                  )}
                  
                  {selectedEvent.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <span>📍 {selectedEvent.location}</span>
                    </div>
                  )}
                </div>

                {/* Availability buttons */}
                {user?.id && getAvailabilityStatus(selectedEvent.id) && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Your Availability</h4>
                    <AvailabilityButtons
                      eventId={selectedEvent.id}
                      currentStatus={getAvailabilityStatus(selectedEvent.id)}
                      onStatusChange={(newStatus) => handleAvailabilityChange(selectedEvent.id, newStatus)}
                    />
                  </div>
                )}
                
                {selectedEvent.description && (
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-sm text-gray-600">{selectedEvent.description}</p>
                  </div>
                )}
                
                {selectedEvent.notes && (
                  <div>
                    <h4 className="font-medium mb-2">Notes</h4>
                    <p className="text-sm text-gray-600">{selectedEvent.notes}</p>
                  </div>
                )}
                
                <div className="flex gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEventAction(selectedEvent, 'setup')}
                  >
                    SETUP
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEventAction(selectedEvent, 'squad')}
                  >
                    SQUAD
                  </Button>
                  {isEventCompleted(selectedEvent) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEventAction(selectedEvent, 'report')}
                    >
                      REPORT
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Event Form Modal */}
        <Dialog open={showEventForm} onOpenChange={setShowEventForm}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedEvent ? 'Edit Event' : 'Create Event'}
              </DialogTitle>
            </DialogHeader>
            <EventForm
              event={convertToEventFormat(selectedEvent)}
              teamId={teams?.[0]?.id || ''}
              onSubmit={(eventData) => {
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

        {/* Post Game Edit Modal */}
        <Dialog open={showPostGameEdit} onOpenChange={setShowPostGameEdit}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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
