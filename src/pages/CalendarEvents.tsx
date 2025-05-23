import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EventForm } from '@/components/events/EventForm';
import { TeamSelectionManager } from '@/components/events/TeamSelectionManager';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Event, GameFormat } from '@/types';
import { Plus, Calendar as CalendarIcon, List, Clock, MapPin, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const CalendarEvents = () => {
  const { teams } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeView, setActiveView] = useState<'calendar' | 'list'>('list'); // Default to list view
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [isTeamSelectionOpen, setIsTeamSelectionOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-select single team
  useEffect(() => {
    if (teams.length === 1 && !selectedTeam) {
      setSelectedTeam(teams[0].id);
    }
  }, [teams, selectedTeam]);

  useEffect(() => {
    if (selectedTeam) {
      loadEvents();
    }
  }, [selectedTeam, currentMonth]);

  const loadEvents = async () => {
    if (!selectedTeam) return;

    try {
      setLoading(true);
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('team_id', selectedTeam)
        .gte('date', startOfMonth.toISOString().split('T')[0])
        .lte('date', endOfMonth.toISOString().split('T')[0])
        .order('date')
        .order('start_time');

      if (error) throw error;

      const eventsData: Event[] = (data || []).map(event => ({
        id: event.id,
        type: event.event_type as Event['type'],
        title: event.title,
        date: event.date,
        startTime: event.start_time || '',
        endTime: event.end_time || '',
        meetingTime: event.meeting_time || '',
        location: event.location || '',
        gameFormat: event.game_format as GameFormat,
        opponent: event.opponent || '',
        isHome: event.is_home ?? true,
        teamId: event.team_id,
        facilityId: event.facility_id || '',
        trainingNotes: event.training_notes || '',
        teams: [event.team_id],
        periods: [],
        createdAt: event.created_at || new Date().toISOString(),
        updatedAt: event.updated_at || new Date().toISOString()
      }));

      setEvents(eventsData);
    } catch (error: any) {
      console.error('Error loading events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (eventData: Partial<Event>) => {
    try {
      const { error } = await supabase
        .from('events')
        .insert({
          team_id: selectedTeam,
          event_type: eventData.type,
          title: eventData.title,
          date: eventData.date,
          start_time: eventData.startTime,
          end_time: eventData.endTime,
          meeting_time: eventData.meetingTime,
          location: eventData.location,
          game_format: eventData.gameFormat,
          opponent: eventData.opponent,
          is_home: eventData.isHome,
          facility_id: eventData.facilityId,
          training_notes: eventData.trainingNotes
        });

      if (error) throw error;

      toast.success('Event created successfully');
      setIsEventFormOpen(false);
      loadEvents();
    } catch (error: any) {
      console.error('Error creating event:', error);
      toast.error('Failed to create event');
    }
  };

  const handleEditEvent = async (eventData: Partial<Event>) => {
    if (!editingEvent) return;

    try {
      const { error } = await supabase
        .from('events')
        .update({
          event_type: eventData.type,
          title: eventData.title,
          date: eventData.date,
          start_time: eventData.startTime,
          end_time: eventData.endTime,
          meeting_time: eventData.meetingTime,
          location: eventData.location,
          game_format: eventData.gameFormat,
          opponent: eventData.opponent,
          is_home: eventData.isHome,
          facility_id: eventData.facilityId,
          training_notes: eventData.trainingNotes
        })
        .eq('id', editingEvent.id);

      if (error) throw error;

      toast.success('Event updated successfully');
      setIsEventFormOpen(false);
      setEditingEvent(null);
      loadEvents();
    } catch (error: any) {
      console.error('Error updating event:', error);
      toast.error('Failed to update event');
    }
  };

  const getEventTypeColor = (type: Event['type']) => {
    switch (type) {
      case 'training': return 'bg-blue-500';
      case 'fixture': return 'bg-red-500';
      case 'friendly': return 'bg-green-500';
      case 'tournament': return 'bg-purple-500';
      case 'festival': return 'bg-orange-500';
      case 'social': return 'bg-pink-500';
      default: return 'bg-gray-500';
    }
  };

  const formatTime = (time?: string) => {
    if (!time) return '';
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => event.date === dateStr);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentMonth);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentMonth(newDate);
  };

  const getCurrentMonthEvents = () => {
    return events.sort((a, b) => {
      if (a.date === b.date) {
        const timeA = a.startTime || '00:00';
        const timeB = b.startTime || '00:00';
        return timeA.localeCompare(timeB);
      }
      return a.date.localeCompare(b.date);
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Calendar & Events</h1>
            <p className="text-muted-foreground">
              Manage your team's schedule and events
            </p>
          </div>
        </div>

        {teams.length === 0 ? (
          <Card>
            <CardContent className="py-8 flex flex-col items-center justify-center text-center">
              <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-1">No Teams Available</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                You need to create a team before you can manage events.
              </p>
              <Button
                onClick={() => window.location.href = '/teams'}
                className="bg-puma-blue-500 hover:bg-puma-blue-600"
              >
                Create Team
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                {teams.length > 1 && (
                  <div className="space-y-2">
                    <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="Select a team" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedTeam && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-sm font-medium min-w-[120px] text-center">
                      {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {selectedTeam && (
                <div className="flex gap-2">
                  <Dialog open={isEventFormOpen} onOpenChange={setIsEventFormOpen}>
                    <DialogTrigger asChild>
                      <Button
                        className="bg-puma-blue-500 hover:bg-puma-blue-600"
                        onClick={() => {
                          setEditingEvent(null);
                          setIsEventFormOpen(true);
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create Event
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
                      <DialogHeader>
                        <DialogTitle>
                          {editingEvent ? 'Edit Event' : 'Create New Event'}
                        </DialogTitle>
                      </DialogHeader>
                      <EventForm
                        event={editingEvent}
                        teamId={selectedTeam}
                        onSubmit={editingEvent ? handleEditEvent : handleCreateEvent}
                        onCancel={() => {
                          setIsEventFormOpen(false);
                          setEditingEvent(null);
                        }}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>

            {selectedTeam ? (
              <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'calendar' | 'list')}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="list" className="flex items-center gap-2">
                    <List className="h-4 w-4" />
                    List View
                  </TabsTrigger>
                  <TabsTrigger value="calendar" className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    Calendar View
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="list">
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        Events for {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </CardTitle>
                      <CardDescription>
                        All events for the selected month
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[600px]">
                        {loading ? (
                          <div className="text-center py-8">Loading events...</div>
                        ) : getCurrentMonthEvents().length === 0 ? (
                          <div className="text-center py-8">
                            <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="font-semibold mb-2">No Events This Month</h3>
                            <p className="text-muted-foreground mb-4">
                              No events scheduled for {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {getCurrentMonthEvents().map((event) => (
                              <Card key={event.id} className="cursor-pointer hover:shadow-md transition-shadow">
                                <CardContent className="p-4">
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <Badge className={`text-white ${getEventTypeColor(event.type)}`}>
                                        {event.type}
                                      </Badge>
                                      <div className="flex gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setEditingEvent(event);
                                            setIsEventFormOpen(true);
                                          }}
                                        >
                                          Edit
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setSelectedEvent(event);
                                            setIsTeamSelectionOpen(true);
                                          }}
                                        >
                                          <Users className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <h4 className="font-semibold text-lg mb-2">{event.title}</h4>
                                      <div className="space-y-2 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                          <CalendarIcon className="h-3 w-3" />
                                          <span>{new Date(event.date).toLocaleDateString('en-US', { 
                                            weekday: 'long', 
                                            month: 'short', 
                                            day: 'numeric' 
                                          })}</span>
                                        </div>
                                        {event.startTime && (
                                          <div className="flex items-center gap-2">
                                            <Clock className="h-3 w-3" />
                                            <span>
                                              {formatTime(event.startTime)}
                                              {event.endTime && ` - ${formatTime(event.endTime)}`}
                                            </span>
                                          </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                          <MapPin className="h-3 w-3" />
                                          <span className="truncate">{event.location}</span>
                                        </div>
                                        {event.opponent && (
                                          <div className="text-sm">
                                            <span className="font-medium">vs {event.opponent}</span>
                                            <span className="ml-2 text-xs">
                                              ({event.isHome ? 'Home' : 'Away'})
                                            </span>
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
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="calendar">
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <div className="text-center py-8">Loading events...</div>
                      ) : (
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          month={currentMonth}
                          onMonthChange={setCurrentMonth}
                          className="rounded-md border"
                          components={{
                            Day: ({ date, ...props }) => {
                              const dayEvents = getEventsForDate(date);
                              return (
                                <div className="relative">
                                  <button {...props}>
                                    {date.getDate()}
                                  </button>
                                  {dayEvents.length > 0 && (
                                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                                      <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                                    </div>
                                  )}
                                </div>
                              );
                            }
                          }}
                        />
                      )}
                    </CardContent>
                  </Card>

                  {selectedDate && (
                    <Card className="mt-4">
                      <CardHeader>
                        <CardTitle>
                          Events for {selectedDate.toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[300px]">
                          {getEventsForDate(selectedDate).length === 0 ? (
                            <p className="text-muted-foreground text-center py-8">
                              No events scheduled for this date
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {getEventsForDate(selectedDate).map((event) => (
                                <Card key={event.id} className="cursor-pointer hover:shadow-md transition-shadow">
                                  <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <Badge className={`text-white ${getEventTypeColor(event.type)}`}>
                                          {event.type}
                                        </Badge>
                                        <div>
                                          <h4 className="font-semibold">{event.title}</h4>
                                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            {event.startTime && (
                                              <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {formatTime(event.startTime)}
                                                {event.endTime && ` - ${formatTime(event.endTime)}`}
                                              </div>
                                            )}
                                            <div className="flex items-center gap-1">
                                              <MapPin className="h-3 w-3" />
                                              {event.location}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            setEditingEvent(event);
                                            setIsEventFormOpen(true);
                                          }}
                                        >
                                          Edit
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            setSelectedEvent(event);
                                            setIsTeamSelectionOpen(true);
                                          }}
                                        >
                                          <Users className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">Please select a team to view events</p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        <Dialog open={isTeamSelectionOpen} onOpenChange={setIsTeamSelectionOpen}>
          <DialogContent className="sm:max-w-[90vw] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Team Selection - {selectedEvent?.title}</DialogTitle>
            </DialogHeader>
            {selectedEvent && (
              <TeamSelectionManager
                eventId={selectedEvent.id}
                teamId={selectedEvent.teamId}
                gameFormat={selectedEvent.gameFormat}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default CalendarEvents;
