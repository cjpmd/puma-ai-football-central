import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarIcon, CheckCircle2, Users, Trash2, Edit, Trophy } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { cn, formatDate } from '@/lib/utils';
import { addDays, format } from 'date-fns';
import { Event } from '@/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsService } from '@/services/eventsService';
import { toast } from 'sonner';
import { DateRange } from 'react-day-picker';
import { playerStatsService } from '@/services/playerStatsService';
import { PostGameEditor } from '@/components/events/PostGameEditor';

const CalendarEventsPage = () => {
  const { teams } = useAuth();
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.id || '');
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState<Date | undefined>(undefined);
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventNotes, setEventNotes] = useState('');
  const [eventEventType, setEventEventType] = useState<'training' | 'match' | 'fixture'>('training');
  const queryClient = useQueryClient();
  const [postGameEventId, setPostGameEventId] = useState<string | null>(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', selectedTeamId],
    queryFn: () => eventsService.getEventsByTeamId(selectedTeamId),
    enabled: !!selectedTeamId,
  });

  const { mutate: createEvent, isLoading: isCreateLoading } = useMutation({
    mutationFn: eventsService.createEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', selectedTeamId] });
      toast.success('Event created successfully!');
      closeCreateModal();
    },
    onError: (error) => {
      console.error("Error creating event:", error);
      toast.error('Failed to create event.');
    },
  });

  const { mutate: updateEvent, isLoading: isUpdateLoading } = useMutation({
    mutationFn: eventsService.updateEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', selectedTeamId] });
      toast.success('Event updated successfully!');
      closeEditModal();
    },
    onError: (error) => {
      console.error("Error updating event:", error);
      toast.error('Failed to update event.');
    },
  });

  const { mutate: deleteEvent, isLoading: isDeleteLoading } = useMutation({
    mutationFn: eventsService.deleteEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', selectedTeamId] });
      toast.success('Event deleted successfully!');
    },
    onError: (error) => {
      console.error("Error deleting event:", error);
      toast.error('Failed to delete event.');
    },
  });

  const handleTeamChange = (teamId: string) => {
    setSelectedTeamId(teamId);
  };

  const handleDateSelect = (date: DateRange | undefined) => {
    setDate(date);
  };

  const handleCreateEvent = () => {
    if (!eventTitle || !eventDate) {
      toast.error('Please fill in all required fields.');
      return;
    }

    const newEvent = {
      team_id: selectedTeamId,
      title: eventTitle,
      description: eventDescription,
      date: format(eventDate, 'yyyy-MM-dd'),
      start_time: eventStartTime,
      end_time: eventEndTime,
      location: eventLocation,
      notes: eventNotes,
      event_type: eventEventType,
    };

    createEvent(newEvent);
  };

  const handleEditEvent = (event: Event) => {
    setSelectedEvent(event);
    setEventTitle(event.title);
    setEventDescription(event.description || '');
    setEventDate(new Date(event.date));
    setEventStartTime(event.start_time || '');
    setEventEndTime(event.end_time || '');
    setEventLocation(event.location || '');
    setEventNotes(event.notes || '');
    setEventEventType(event.event_type);
    setIsEditModalOpen(true);
  };

  const handleUpdateEvent = () => {
    if (!selectedEvent) return;

    const updatedEvent = {
      id: selectedEvent.id,
      team_id: selectedTeamId,
      title: eventTitle,
      description: eventDescription,
      date: format(eventDate, 'yyyy-MM-dd'),
      start_time: eventStartTime,
      end_time: eventEndTime,
      location: eventLocation,
      notes: eventNotes,
      event_type: eventEventType,
    };

    updateEvent(updatedEvent);
  };

  const handleDeleteEvent = (eventId: string) => {
    deleteEvent(eventId);
  };

  const openCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setEventTitle('');
    setEventDescription('');
    setEventDate(undefined);
    setEventStartTime('');
    setEventEndTime('');
    setEventLocation('');
    setEventNotes('');
    setEventEventType('training');
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedEvent(null);
    setEventTitle('');
    setEventDescription('');
    setEventDate(undefined);
    setEventStartTime('');
    setEventEndTime('');
    setEventLocation('');
    setEventNotes('');
    setEventEventType('training');
  };

  const filteredEvents = events.filter((event) => {
    if (!date?.from || !date?.to) return true;
    const eventDateObj = new Date(event.date);
    return eventDateObj >= date.from && eventDateObj <= date.to;
  });

  const handlePostGameEdit = (event: Event) => {
    setPostGameEventId(event.id);
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

          <div className="flex items-center space-x-4">
            {teams.length > 1 && (
              <div className="min-w-[250px]">
                <Select value={selectedTeamId} onValueChange={handleTeamChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
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

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[300px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (
                    date.to ? (
                      `${format(date.from, "MMM dd, yyyy")} - ${format(date.to, "MMM dd, yyyy")}`
                    ) : (
                      format(date.from, "MMM dd, yyyy")
                    )
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={handleDateSelect}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            <Button onClick={openCreateModal}>
              Create Event
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoading ? (
                <div className="text-center py-4 col-span-full">Loading events...</div>
              ) : filteredEvents.length === 0 ? (
                <div className="text-center py-4 col-span-full">No events found for the selected date range.</div>
              ) : (
                filteredEvents.map((event) => (
                  <div key={event.id} className="border rounded-md p-4">
                    <h3 className="text-lg font-semibold">{event.title}</h3>
                    <p className="text-sm text-muted-foreground">{formatDate(event.date, 'dd MMM yyyy')}</p>
                    {event.start_time && event.end_time && (
                      <p className="text-sm text-muted-foreground">
                        {event.start_time} - {event.end_time}
                      </p>
                    )}
                    {event.location && (
                      <p className="text-sm text-muted-foreground">Location: {event.location}</p>
                    )}
                    {event.description && (
                      <p className="text-sm mt-2">{event.description}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      
        {/* Updated event list section with post-game edit button */}
        <div className="space-y-3">
          {filteredEvents.map((event) => {
            const isCompleted = new Date(event.date) < new Date() || 
              (new Date(event.date).toDateString() === new Date().toDateString() && 
               event.end_time && new Date(`2024-01-01 ${event.end_time}`) < new Date(`2024-01-01 ${new Date().toTimeString().slice(0, 8)}`));
            
            return (
              <div key={event.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge 
                    className={
                      event.event_type === "match" || event.event_type === "fixture" 
                        ? "bg-red-500" 
                        : "bg-blue-500"
                    }
                  >
                    {event.event_type}
                  </Badge>
                  <div className="flex items-center gap-2">
                    {isCompleted && (event.event_type === "match" || event.event_type === "fixture") && (
                      <span className="text-lg text-green-600">🏆</span>
                    )}
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditEvent(event)}
                      >
                        Edit
                      </Button>
                      {isCompleted && (event.event_type === "match" || event.event_type === "fixture") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePostGameEdit(event)}
                        >
                          <Trophy className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedEvent(event)}
                      >
                        <Users className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteEvent(event.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                <Card>
                  <CardContent>
                    <h3 className="text-lg font-semibold">{event.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(event.date, 'dd MMM yyyy')}
                    </p>
                    {event.start_time && event.end_time && (
                      <p className="text-sm text-muted-foreground">
                        {event.start_time} - {event.end_time}
                      </p>
                    )}
                    {event.location && (
                      <p className="text-sm text-muted-foreground">Location: {event.location}</p>
                    )}
                    {event.description && (
                      <p className="text-sm mt-2">{event.description}</p>
                    )}
                    {event.notes && (
                      <p className="text-sm mt-2">Notes: {event.notes}</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Create Event Modal */}
        <Dialog open={isCreateModalOpen} onOpenChange={closeCreateModal}>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Create Event</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">
                  Title
                </Label>
                <Input id="title" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Input id="description" value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right">
                  Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !eventDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {eventDate ? (
                        format(eventDate, "MMM dd, yyyy")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={eventDate}
                      onSelect={setEventDate}
                      defaultMonth={eventDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="startTime" className="text-right">
                  Start Time
                </Label>
                <Input type="time" id="startTime" value={eventStartTime} onChange={(e) => setEventStartTime(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="endTime" className="text-right">
                  End Time
                </Label>
                <Input type="time" id="endTime" value={eventEndTime} onChange={(e) => setEventEndTime(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="location" className="text-right">
                  Location
                </Label>
                <Input id="location" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="notes" className="text-right">
                  Notes
                </Label>
                <Input id="notes" value={eventNotes} onChange={(e) => setEventNotes(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="eventType" className="text-right">
                  Event Type
                </Label>
                <Select value={eventEventType} onValueChange={value => setEventEventType(value as 'training' | 'match' | 'fixture')}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="match">Match</SelectItem>
                    <SelectItem value="fixture">Fixture</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="button" variant="secondary" onClick={closeCreateModal}>
                Cancel
              </Button>
              <Button type="submit" onClick={handleCreateEvent} disabled={isCreateLoading}>
                {isCreateLoading ? "Creating..." : "Create Event"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Event Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={closeEditModal}>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Edit Event</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">
                  Title
                </Label>
                <Input id="title" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Input id="description" value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right">
                  Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !eventDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {eventDate ? (
                        format(eventDate, "MMM dd, yyyy")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={eventDate}
                      onSelect={setEventDate}
                      defaultMonth={eventDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="startTime" className="text-right">
                  Start Time
                </Label>
                <Input type="time" id="startTime" value={eventStartTime} onChange={(e) => setEventStartTime(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="endTime" className="text-right">
                  End Time
                </Label>
                <Input type="time" id="endTime" value={eventEndTime} onChange={(e) => setEventEndTime(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="location" className="text-right">
                  Location
                </Label>
                <Input id="location" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="notes" className="text-right">
                  Notes
                </Label>
                <Input id="notes" value={eventNotes} onChange={(e) => setEventNotes(e.target.value)} className="col-span-3" />
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="eventType" className="text-right">
                  Event Type
                </Label>
                <Select value={eventEventType} onValueChange={value => setEventEventType(value as 'training' | 'match' | 'fixture')}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="match">Match</SelectItem>
                    <SelectItem value="fixture">Fixture</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="button" variant="secondary" onClick={closeEditModal}>
                Cancel
              </Button>
              <Button type="submit" onClick={handleUpdateEvent} disabled={isUpdateLoading}>
                {isUpdateLoading ? "Updating..." : "Update Event"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Post-Game Editor Modal */}
        {postGameEventId && (
          <PostGameEditor
            eventId={postGameEventId}
            isOpen={!!postGameEventId}
            onClose={() => setPostGameEventId(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default CalendarEventsPage;
