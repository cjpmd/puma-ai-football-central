import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { PlusCircle, Calendar, MapPin, Clock, Users, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EventForm } from '@/components/events/EventForm';
import { Event } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const CalendarEvents = () => {
  const { teams } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    if (teams.length > 0) {
      loadEvents();
    }
  }, [teams]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      console.log('Loading events for teams:', teams.map(t => t.id));
      
      const teamIds = teams.map(t => t.id);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .in('team_id', teamIds)
        .order('date', { ascending: true });

      if (error) {
        console.error('Error loading events:', error);
        throw error;
      }

      console.log('Loaded events:', data);

      // Transform database fields to match interface
      const transformedEvents: Event[] = (data || []).map(event => ({
        id: event.id,
        type: event.event_type as any,
        teamId: event.team_id,
        title: event.title,
        date: event.date,
        meetingTime: event.meeting_time || '09:00',
        startTime: event.start_time || '10:00',
        endTime: event.end_time || '11:30',
        location: event.location || '',
        gameFormat: event.game_format as any || '7-a-side',
        opponent: event.opponent,
        isHome: event.is_home,
        teams: [event.team_id],
        periods: [],
        createdAt: event.created_at,
        updatedAt: event.updated_at,
        facilityId: event.facility_id,
        coachNotes: event.coach_notes,
        staffNotes: event.staff_notes,
        trainingNotes: event.training_notes
      }));

      setEvents(transformedEvents);
    } catch (error: any) {
      console.error('Error in loadEvents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load events',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (eventData: Partial<Event>) => {
    try {
      console.log('Creating event:', eventData);

      const insertData: any = {
        event_type: eventData.type,
        team_id: eventData.teamId,
        title: eventData.title,
        date: eventData.date,
        meeting_time: eventData.meetingTime,
        start_time: eventData.startTime,
        end_time: eventData.endTime,
        location: eventData.location,
        game_format: eventData.gameFormat,
        opponent: eventData.opponent,
        is_home: eventData.isHome
      };

      // Add facility if selected
      if (eventData.facilityId) {
        insertData.facility_id = eventData.facilityId;
      }

      // Add notes for training events
      if (eventData.type === 'training' && eventData.trainingNotes) {
        insertData.training_notes = eventData.trainingNotes;
      }

      const { data, error } = await supabase
        .from('events')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error creating event:', error);
        throw error;
      }

      console.log('Event created successfully:', data);
      
      setIsEventDialogOpen(false);
      await loadEvents();
      
      toast({
        title: 'Event Created',
        description: `${eventData.title} has been successfully created.`,
      });
    } catch (error: any) {
      console.error('Error in handleCreateEvent:', error);
      toast({
        title: 'Error',
        description: 'Failed to create event',
        variant: 'destructive',
      });
    }
  };

  const handleEditEvent = async (eventData: Partial<Event>) => {
    if (!selectedEvent) return;

    try {
      console.log('Updating event:', eventData);

      const updateData: any = {
        event_type: eventData.type,
        title: eventData.title,
        date: eventData.date,
        meeting_time: eventData.meetingTime,
        start_time: eventData.startTime,
        end_time: eventData.endTime,
        location: eventData.location,
        game_format: eventData.gameFormat,
        opponent: eventData.opponent,
        is_home: eventData.isHome,
        updated_at: new Date().toISOString()
      };

      if (eventData.facilityId) {
        updateData.facility_id = eventData.facilityId;
      }

      if (eventData.type === 'training' && eventData.trainingNotes) {
        updateData.training_notes = eventData.trainingNotes;
      }

      const { error } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', selectedEvent.id);

      if (error) {
        console.error('Error updating event:', error);
        throw error;
      }

      console.log('Event updated successfully');
      
      setIsEventDialogOpen(false);
      setSelectedEvent(null);
      await loadEvents();
      
      toast({
        title: 'Event Updated',
        description: `${eventData.title} has been successfully updated.`,
      });
    } catch (error: any) {
      console.error('Error in handleEditEvent:', error);
      toast({
        title: 'Error',
        description: 'Failed to update event',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      console.log('Deleting event:', eventId);

      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) {
        console.error('Error deleting event:', error);
        throw error;
      }

      console.log('Event deleted successfully');
      await loadEvents();
      
      toast({
        title: 'Event Deleted',
        description: 'Event has been successfully deleted.',
      });
    } catch (error: any) {
      console.error('Error in handleDeleteEvent:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete event',
        variant: 'destructive',
      });
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'fixture': return 'bg-red-500';
      case 'friendly': return 'bg-blue-500';
      case 'training': return 'bg-green-500';
      case 'tournament': return 'bg-purple-500';
      case 'festival': return 'bg-yellow-500';
      case 'social': return 'bg-pink-500';
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

  const formatTime = (timeStr: string) => {
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Calendar & Events</h1>
              <p className="text-muted-foreground">
                Manage team events, fixtures, and training sessions
              </p>
            </div>
          </div>
          <div className="text-center py-8">Loading events...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Calendar & Events</h1>
            <p className="text-muted-foreground">
              Manage team events, fixtures, and training sessions
            </p>
          </div>
          {teams.length > 0 && (
            <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => {
                    setSelectedEvent(null);
                    setSelectedTeamId(teams[0]?.id || '');
                  }} 
                  className="bg-puma-blue-500 hover:bg-puma-blue-600"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Event
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>
                    {selectedEvent ? 'Edit Event' : 'Create New Event'}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedEvent ? 'Update the event details below.' : 'Create a new training session, fixture, or other team event.'}
                  </DialogDescription>
                </DialogHeader>
                <EventForm 
                  event={selectedEvent} 
                  teamId={selectedTeamId}
                  onSubmit={selectedEvent ? handleEditEvent : handleCreateEvent} 
                  onCancel={() => {
                    setIsEventDialogOpen(false);
                    setSelectedEvent(null);
                  }}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>

        {teams.length === 0 ? (
          <Card className="border-dashed border-2 border-muted">
            <CardContent className="py-8 flex flex-col items-center justify-center text-center">
              <div className="rounded-full bg-muted p-3 mb-4">
                <Calendar className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-1">No Teams Yet</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                You need to create a team first before you can manage events.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {teams.map((team) => {
              const teamEvents = events.filter(event => event.teamId === team.id);
              
              return (
                <div key={team.id} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">{team.name} Events</h2>
                    <Badge variant="outline">{team.gameFormat}</Badge>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {teamEvents.map((event) => (
                      <Card key={event.id} className="relative group">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{event.title}</CardTitle>
                            <div className="flex gap-1">
                              <Badge className={`text-white ${getEventTypeColor(event.type)}`}>
                                {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                                onClick={() => {
                                  setSelectedEvent(event);
                                  setSelectedTeamId(event.teamId);
                                  setIsEventDialogOpen(true);
                                }}
                              >
                                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                                </svg>
                              </Button>
                              {(event.type === 'fixture' || event.type === 'friendly' || event.type === 'tournament' || event.type === 'festival') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                                  title="Team Selection"
                                >
                                  <Settings className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this event?')) {
                                    handleDeleteEvent(event.id);
                                  }
                                }}
                              >
                                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                </svg>
                              </Button>
                            </div>
                          </div>
                          <CardDescription>
                            {formatDate(event.date)}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {formatTime(event.startTime)} - {formatTime(event.endTime)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>{event.location}</span>
                            </div>
                            {event.opponent && (
                              <div className="flex items-center gap-2 text-sm">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span>vs {event.opponent}</span>
                                <Badge variant={event.isHome ? 'default' : 'secondary'} className="ml-auto">
                                  {event.isHome ? 'Home' : 'Away'}
                                </Badge>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">Format:</span>
                              <span className="font-medium">{event.gameFormat}</span>
                            </div>
                            {event.trainingNotes && (
                              <div className="text-sm text-muted-foreground border-t pt-2">
                                <strong>Training Notes:</strong>
                                <p className="mt-1">{event.trainingNotes}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {/* Add Event Card */}
                    <Card className="border-dashed border-2 border-muted hover:border-puma-blue-300 transition-colors cursor-pointer"
                          onClick={() => {
                            setSelectedEvent(null);
                            setSelectedTeamId(team.id);
                            setIsEventDialogOpen(true);
                          }}>
                      <CardContent className="py-8 flex flex-col items-center justify-center text-center">
                        <PlusCircle className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Create Event</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CalendarEvents;
