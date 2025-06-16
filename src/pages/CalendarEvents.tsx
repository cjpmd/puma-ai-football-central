import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarIcon, Users, Trash2, Edit, Trophy, Calendar as CalendarGridIcon, List, Grid, Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { cn, formatDate } from '@/lib/utils';
import { format } from 'date-fns';
import { DatabaseEvent } from '@/types/event';
import { GameFormat } from '@/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsService, CreateEventData, UpdateEventData } from '@/services/eventsService';
import { toast } from 'sonner';
import { DateRange } from 'react-day-picker';
import { PostGameEditor } from '@/components/events/PostGameEditor';
import { EventTeamsTable } from '@/components/events/EventTeamsTable';
import { CalendarGridView } from '@/components/events/CalendarGridView';
import { EventsGridView } from '@/components/events/EventsGridView';
import { Calendar } from '@/components/ui/calendar';
import { AvailabilityNotificationService } from '@/components/events/AvailabilityNotificationService';
import { supabase } from '@/integrations/supabase/client';

const CalendarEventsPage = () => {
  const { teams } = useAuth();
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.id || '');
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [selectedEvent, setSelectedEvent] = useState<DatabaseEvent | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTeamSelectionOpen, setIsTeamSelectionOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'grid'>('grid');
  const [showAvailabilityRequests, setShowAvailabilityRequests] = useState(false);
  
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState<Date | undefined>(undefined);
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventNotes, setEventNotes] = useState('');
  const [eventEventType, setEventEventType] = useState<'training' | 'fixture' | 'tournament' | 'festival' | 'social' | 'friendly' | 'match'>('training');
  const [eventOpponent, setEventOpponent] = useState('');
  const [eventGameFormat, setEventGameFormat] = useState<GameFormat>('7-a-side');
  const [eventGameDuration, setEventGameDuration] = useState<number>(90);
  const [eventKitSelection, setEventKitSelection] = useState('home');
  const queryClient = useQueryClient();
  const [postGameEventId, setPostGameEventId] = useState<string | null>(null);
  
  // Fresh team data state for accurate defaults
  const [freshTeamDefaults, setFreshTeamDefaults] = useState<{
    gameFormat: GameFormat;
    gameDuration: number;
  }>({ gameFormat: '7-a-side', gameDuration: 90 });

  // Get current team's default values
  const currentTeam = teams.find(team => team.id === selectedTeamId);
  const teamDefaultGameFormat = currentTeam?.gameFormat || '7-a-side';
  const teamDefaultGameDuration = currentTeam?.gameDuration || 90;

  const eventTypes = [
    { value: 'training', label: 'Training' },
    { value: 'fixture', label: 'Fixture' },
    { value: 'friendly', label: 'Friendly' },
    { value: 'match', label: 'Match' },
    { value: 'tournament', label: 'Tournament' },
    { value: 'festival', label: 'Festival' },
    { value: 'social', label: 'Social Event' }
  ];

  // Update defaults when team changes
  useEffect(() => {
    if (currentTeam) {
      setEventGameFormat(currentTeam.gameFormat || '7-a-side');
      setEventGameDuration(currentTeam.gameDuration || 90);
    }
  }, [currentTeam]);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', selectedTeamId],
    queryFn: () => eventsService.getEventsByTeamId(selectedTeamId),
    enabled: !!selectedTeamId,
  });

  const { mutate: createEvent, isPending: isCreateLoading } = useMutation({
    mutationFn: (eventData: CreateEventData) => eventsService.createEvent(eventData),
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

  const { mutate: updateEvent, isPending: isUpdateLoading } = useMutation({
    mutationFn: (eventData: UpdateEventData) => eventsService.updateEvent(eventData),
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

  const { mutate: deleteEvent, isPending: isDeleteLoading } = useMutation({
    mutationFn: (eventId: string) => eventsService.deleteEvent(eventId),
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

    const isMatchType = eventEventType === 'match' || eventEventType === 'fixture' || eventEventType === 'friendly';

    const newEvent: CreateEventData = {
      team_id: selectedTeamId,
      title: eventTitle,
      description: eventDescription || undefined,
      date: format(eventDate, 'yyyy-MM-dd'),
      start_time: eventStartTime || undefined,
      end_time: eventEndTime || undefined,
      location: eventLocation || undefined,
      notes: eventNotes || undefined,
      event_type: eventEventType,
      game_format: eventGameFormat,
      game_duration: eventGameDuration,
      opponent: isMatchType ? eventOpponent || undefined : undefined,
    };

    console.log('Creating event with data:', newEvent);
    createEvent(newEvent);
  };

  const handleEditEvent = async (event: DatabaseEvent) => {
    try {
      console.log('Loading fresh event data for event:', event.id);
      const { data: freshEvent, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', event.id)
        .single();
        
      if (error) {
        console.error('Error loading fresh event data:', error);
        setSelectedEvent(event);
        setEventTitle(event.title);
        setEventDescription(event.description || '');
        setEventDate(new Date(event.date));
        setEventStartTime(event.start_time || '');
        setEventEndTime(event.end_time || '');
        setEventLocation(event.location || '');
        setEventNotes(event.notes || '');
        setEventEventType(event.event_type as any);
        setEventOpponent(event.opponent || '');
        setEventGameFormat((event.game_format || '7-a-side') as GameFormat);
        setEventGameDuration(event.game_duration || teamDefaultGameDuration);
        setEventKitSelection((event as any).kit_selection || 'home');
      } else {
        console.log('Fresh event data loaded:', freshEvent);
        setSelectedEvent(freshEvent as DatabaseEvent);
        setEventTitle(freshEvent.title);
        setEventDescription(freshEvent.description || '');
        setEventDate(new Date(freshEvent.date));
        setEventStartTime(freshEvent.start_time || '');
        setEventEndTime(freshEvent.end_time || '');
        setEventLocation(freshEvent.location || '');
        setEventNotes(freshEvent.notes || '');
        setEventEventType(freshEvent.event_type as any);
        setEventOpponent(freshEvent.opponent || '');
        setEventGameFormat((freshEvent.game_format || '7-a-side') as GameFormat);
        setEventGameDuration(freshEvent.game_duration || teamDefaultGameDuration);
        setEventKitSelection(freshEvent.kit_selection || 'home');
        
        console.log('Event form data set with fresh values, gameDuration:', freshEvent.game_duration);
      }
    } catch (error) {
      console.error('Error loading fresh event data:', error);
      setSelectedEvent(event);
      setEventTitle(event.title);
      setEventDescription(event.description || '');
      setEventDate(new Date(event.date));
      setEventStartTime(event.start_time || '');
      setEventEndTime(event.end_time || '');
      setEventLocation(event.location || '');
      setEventNotes(event.notes || '');
      setEventEventType(event.event_type as any);
      setEventOpponent(event.opponent || '');
      setEventGameFormat((event.game_format || '7-a-side') as GameFormat);
      setEventGameDuration(event.game_duration || teamDefaultGameDuration);
      setEventKitSelection((event as any).kit_selection || 'home');
    }
    
    setIsEditModalOpen(true);
  };

  const handleUpdateEvent = () => {
    if (!selectedEvent || !eventDate) return;

    const isMatchType = eventEventType === 'match' || eventEventType === 'fixture' || eventEventType === 'friendly';

    const updatedEvent: UpdateEventData = {
      id: selectedEvent.id,
      team_id: selectedTeamId,
      title: eventTitle,
      description: eventDescription || undefined,
      date: format(eventDate, 'yyyy-MM-dd'),
      start_time: eventStartTime || undefined,
      end_time: eventEndTime || undefined,
      location: eventLocation || undefined,
      notes: eventNotes || undefined,
      event_type: eventEventType,
      game_format: eventGameFormat,
      game_duration: eventGameDuration,
      opponent: isMatchType ? eventOpponent || undefined : undefined,
    };

    updateEvent(updatedEvent);
  };

  const handleScoreUpdate = (eventId: string, scores: any) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const updatedEvent: UpdateEventData = {
      ...event,
      scores,
      player_of_match_id: event.player_of_match_id || undefined
    };

    updateEvent(updatedEvent);
  };

  const handlePOTMUpdate = (eventId: string, potmData: any) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const updatedEvent: UpdateEventData = {
      ...event,
      ...potmData
    };

    updateEvent(updatedEvent);
  };

  const handleDeleteEvent = (eventId: string) => {
    deleteEvent(eventId);
  };

  const openCreateModal = async () => {
    try {
      console.log('Loading fresh team data for create modal, team:', selectedTeamId);
      const { data: freshTeam, error } = await supabase
        .from('teams')
        .select('*')
        .eq('id', selectedTeamId)
        .single();
        
      if (error) {
        console.error('Error loading fresh team data:', error);
        // Fall back to cached values
        setEventGameFormat(teamDefaultGameFormat);
        setEventGameDuration(teamDefaultGameDuration);
        setFreshTeamDefaults({ gameFormat: teamDefaultGameFormat, gameDuration: teamDefaultGameDuration });
      } else {
        console.log('Fresh team data loaded for create modal:', freshTeam);
        // Use fresh database values
        const freshFormat = (freshTeam.game_format || '7-a-side') as GameFormat;
        const freshDuration = freshTeam.game_duration || 90;
        
        setEventGameFormat(freshFormat);
        setEventGameDuration(freshDuration);
        setFreshTeamDefaults({ gameFormat: freshFormat, gameDuration: freshDuration });
        
        console.log('Set create modal defaults - gameFormat:', freshTeam.game_format, 'gameDuration:', freshTeam.game_duration);
      }
    } catch (error) {
      console.error('Error loading fresh team data:', error);
      // Fall back to cached values
      setEventGameFormat(teamDefaultGameFormat);
      setEventGameDuration(teamDefaultGameDuration);
      setFreshTeamDefaults({ gameFormat: teamDefaultGameFormat, gameDuration: teamDefaultGameDuration });
    }
    
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
    setEventOpponent('');
    setEventGameFormat(freshTeamDefaults.gameFormat);
    setEventGameDuration(freshTeamDefaults.gameDuration);
    setEventKitSelection('home');
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
    setEventOpponent('');
    setEventGameFormat(teamDefaultGameFormat);
    setEventGameDuration(teamDefaultGameDuration);
    setEventKitSelection('home');
  };

  const handleTeamSelection = (event: DatabaseEvent) => {
    setSelectedEvent(event);
    setIsTeamSelectionOpen(true);
  };

  const handleTeamSelectionClose = () => {
    setIsTeamSelectionOpen(false);
    setSelectedEvent(null);
  };

  const handlePostGameEdit = (event: DatabaseEvent) => {
    setPostGameEventId(event.id);
  };

  const getEventOutcomes = (event: DatabaseEvent) => {
    if (!event.scores || typeof event.scores !== 'object') return [];
    
    const outcomes = [];
    const scores = event.scores as any;
    
    for (let i = 1; i <= 4; i++) {
      const outcomeKey = `outcome_${i}`;
      if (scores[outcomeKey]) {
        outcomes.push(scores[outcomeKey]);
      }
    }
    
    return outcomes;
  };

  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case 'win': return '🏆';
      case 'draw': return '🤝';
      case 'loss': return '❌';
      default: return '';
    }
  };

  const filteredEvents = events.filter((event) => {
    if (!date?.from || !date?.to) return true;
    const eventDateObj = new Date(event.date);
    return eventDateObj >= date.from && eventDateObj <= date.to;
  });

  const isMatchType = (eventType: string) => 
    eventType === "match" || eventType === "fixture" || eventType === "friendly";

  const gameFormats: GameFormat[] = ['3-a-side', '4-a-side', '5-a-side', '7-a-side', '9-a-side', '11-a-side'];
  const kitOptions = ['home', 'away', 'training'];

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
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
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

            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('calendar')}
              >
                <CalendarGridIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant={showAvailabilityRequests ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowAvailabilityRequests(!showAvailabilityRequests)}
            >
              <Bell className="h-4 w-4" />
            </Button>

            {viewMode === 'list' && (
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
                    onSelect={setDate}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            )}

            <Button onClick={openCreateModal}>
              Create Event
            </Button>
          </div>
        </div>

        {showAvailabilityRequests && (
          <AvailabilityNotificationService />
        )}

        {viewMode === 'grid' ? (
          <EventsGridView
            events={events}
            onEditEvent={(event) => {
              handleEditEvent(event);
            }}
            onTeamSelection={(event) => {
              handleTeamSelection(event);
            }}
            onPostGameEdit={handlePostGameEdit}
            onDeleteEvent={handleDeleteEvent}
            onScoreEdit={() => {}} // Remove this - functionality moved to PostGameEditor
          />
        ) : viewMode === 'calendar' ? (
          <CalendarGridView
            events={events}
            onEditEvent={(event) => {
              handleEditEvent(event);
            }}
            onTeamSelection={(event) => {
              handleTeamSelection(event);
            }}
            onPostGameEdit={handlePostGameEdit}
            onDeleteEvent={handleDeleteEvent}
          />
        ) : (
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-4">Loading events...</div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-4">No events found for the selected date range.</div>
            ) : (
              filteredEvents.map((event) => {
                const isCompleted = new Date(event.date) < new Date() || 
                  (new Date(event.date).toDateString() === new Date().toDateString() && 
                   event.end_time && new Date(`2024-01-01 ${event.end_time}`) < new Date(`2024-01-01 ${new Date().toTimeString().slice(0, 8)}`));
                
                const eventIsMatchType = isMatchType(event.event_type);
                const outcomes = getEventOutcomes(event);
                
                return (
                  <div key={event.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge 
                          className={
                            eventIsMatchType 
                              ? "bg-red-500" 
                              : "bg-blue-500"
                          }
                        >
                          {event.event_type}
                        </Badge>
                        {(event as any).kit_selection && (
                          <Badge variant="outline">
                            {(event as any).kit_selection} kit
                          </Badge>
                        )}
                        {isCompleted && eventIsMatchType && outcomes.length > 0 && (
                          <div className="flex gap-1">
                            {outcomes.map((outcome, index) => (
                              <span key={index} className="text-lg">{getOutcomeIcon(outcome)}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              handleEditEvent(event);
                            }}
                            title="Edit Event"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              handleTeamSelection(event);
                            }}
                            title="Team Selection"
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                          
                          {eventIsMatchType && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePostGameEdit(event)}
                              title="Post-Game Editor"
                            >
                              <Trophy className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteEvent(event.id)}
                            title="Delete Event"
                            disabled={isDeleteLoading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <Card>
                      <CardContent className="pt-4">
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
                        {event.opponent && (
                          <p className="text-sm text-muted-foreground">Opponent: {event.opponent}</p>
                        )}
                        {(event as any).kit_selection && (
                          <p className="text-sm text-muted-foreground">Kit: {(event as any).kit_selection}</p>
                        )}
                        {event.scores && eventIsMatchType && (
                          <div className="text-sm text-muted-foreground">
                            {outcomes.length > 0 && (
                              <div className="flex items-center gap-2 mt-1">
                                <span>Outcomes:</span>
                                {outcomes.map((outcome, index) => (
                                  <span key={index} className="flex items-center gap-1">
                                    {getOutcomeIcon(outcome)} {outcome}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
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
              })
            )}
          </div>
        )}

        <Dialog open={isCreateModalOpen} onOpenChange={closeCreateModal}>
          <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Event</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="eventType" className="text-right">
                  Event Type
                </Label>
                <Select value={eventEventType} onValueChange={value => setEventEventType(value as any)}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
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
                <Label htmlFor="kitSelection" className="text-right">
                  Kit
                </Label>
                <Select value={eventKitSelection} onValueChange={setEventKitSelection}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select kit" />
                  </SelectTrigger>
                  <SelectContent>
                    {kitOptions.map((kit) => (
                      <SelectItem key={kit} value={kit}>
                        {kit.charAt(0).toUpperCase() + kit.slice(1)} Kit
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="gameFormat" className="text-right">
                  Game Format
                </Label>
                <Select value={eventGameFormat} onValueChange={value => setEventGameFormat(value as GameFormat)}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select game format" />
                  </SelectTrigger>
                  <SelectContent>
                    {gameFormats.map((format) => (
                      <SelectItem key={format} value={format}>
                        {format} {format === freshTeamDefaults.gameFormat ? '(Team Default)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="gameDuration" className="text-right">
                  Game Duration
                </Label>
                <div className="col-span-3 space-y-2">
                  <Input
                    id="gameDuration"
                    type="number"
                    min="1"
                    max="180"
                    value={eventGameDuration}
                    onChange={(e) => setEventGameDuration(parseInt(e.target.value) || freshTeamDefaults.gameDuration)}
                    placeholder={freshTeamDefaults.gameDuration.toString()}
                  />
                  <p className="text-sm text-muted-foreground">
                    Team default: {freshTeamDefaults.gameDuration} minutes
                  </p>
                </div>
              </div>

              {isMatchType(eventEventType) && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="opponent" className="text-right">
                    Opponent
                  </Label>
                  <Input 
                    id="opponent" 
                    value={eventOpponent} 
                    onChange={(e) => setEventOpponent(e.target.value)} 
                    className="col-span-3" 
                    placeholder="Enter opponent name"
                  />
                </div>
              )}
              
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
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={closeCreateModal}>
                Cancel
              </Button>
              <Button type="submit" onClick={handleCreateEvent} disabled={isCreateLoading}>
                {isCreateLoading ? "Creating..." : "Create Event"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditModalOpen} onOpenChange={closeEditModal}>
          <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Event</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="eventType" className="text-right">
                  Event Type
                </Label>
                <Select value={eventEventType} onValueChange={value => setEventEventType(value as any)}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
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
                <Label htmlFor="kitSelection" className="text-right">
                  Kit
                </Label>
                <Select value={eventKitSelection} onValueChange={setEventKitSelection}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select kit" />
                  </SelectTrigger>
                  <SelectContent>
                    {kitOptions.map((kit) => (
                      <SelectItem key={kit} value={kit}>
                        {kit.charAt(0).toUpperCase() + kit.slice(1)} Kit
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="gameFormat" className="text-right">
                  Game Format
                </Label>
                <Select value={eventGameFormat} onValueChange={value => setEventGameFormat(value as GameFormat)}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select game format" />
                  </SelectTrigger>
                  <SelectContent>
                    {gameFormats.map((format) => (
                      <SelectItem key={format} value={format}>
                        {format} {format === teamDefaultGameFormat ? '(Team Default)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="gameDuration" className="text-right">
                  Game Duration
                </Label>
                <div className="col-span-3 space-y-2">
                  <Input
                    id="gameDuration"
                    type="number"
                    min="1"
                    max="180"
                    value={eventGameDuration}
                    onChange={(e) => setEventGameDuration(parseInt(e.target.value) || teamDefaultGameDuration)}
                    placeholder={teamDefaultGameDuration.toString()}
                  />
                  <p className="text-sm text-muted-foreground">
                    Team default: {teamDefaultGameDuration} minutes
                  </p>
                </div>
              </div>

              {isMatchType(eventEventType) && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="opponent" className="text-right">
                    Opponent
                  </Label>
                  <Input 
                    id="opponent" 
                    value={eventOpponent} 
                    onChange={(e) => setEventOpponent(e.target.value)} 
                    className="col-span-3" 
                    placeholder="Enter opponent name"
                  />
                </div>
              )}
              
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
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={closeEditModal}>
                Cancel
              </Button>
              <Button type="submit" onClick={handleUpdateEvent} disabled={isUpdateLoading}>
                {isUpdateLoading ? "Updating..." : "Update Event"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isTeamSelectionOpen} onOpenChange={handleTeamSelectionClose}>
          <DialogContent className="sm:max-w-[900px] max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Team Selection - {selectedEvent?.title}</DialogTitle>
            </DialogHeader>
            {selectedEvent && (
              <EventTeamsTable
                eventId={selectedEvent.id}
                primaryTeamId={selectedTeamId}
                gameFormat={selectedEvent.game_format || '7-a-side'}
                onClose={handleTeamSelectionClose}
              />
            )}
          </DialogContent>
        </Dialog>

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
