import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format, isSameDay, isToday, isPast, parseISO, startOfDay } from 'date-fns';
import { isEventPast, formatTime } from '@/utils/eventUtils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useClubContext } from '@/contexts/ClubContext';
import { useTeamContext } from '@/contexts/TeamContext';
import { EnhancedTeamSelectionManager } from '@/components/events/EnhancedTeamSelectionManager';
import { EventForm } from '@/components/events/EventForm';
import { PostGameEditor } from '@/components/events/PostGameEditor';
import { MobileEventForm } from '@/components/events/MobileEventForm';
import { DatabaseEvent } from '@/types/event';
import { GameFormat } from '@/types';
import { EnhancedKitAvatar } from '@/components/shared/EnhancedKitAvatar';
import { Calendar, Clock, MapPin, Users, User, Link2, AlertCircle, Plus } from 'lucide-react';
import { MobileTeamSelectionView } from '@/components/events/MobileTeamSelectionView';
import { AvailabilityStatusBadge } from '@/components/events/AvailabilityStatusBadge';
import { userAvailabilityService, UserAvailabilityStatus } from '@/services/userAvailabilityService';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { eventsService } from '@/services/eventsService';
import { useAuthorization } from '@/contexts/AuthorizationContext';
import { EditProfileModal } from '@/components/users/EditProfileModal';
import { StaffAssignmentHelper } from '@/components/debug/StaffAssignmentHelper';
import { MultiRoleAvailabilityControls } from '@/components/events/MultiRoleAvailabilityControls';
import { multiRoleAvailabilityService } from '@/services/multiRoleAvailabilityService';
import { ManageConnectionsModal } from '@/components/users/ManageConnectionsModal';
import { getUserContextForEvent, formatEventTimeDisplay, UserTeamContext } from '@/utils/teamTimingUtils';

const tabs = [
  { id: 'fixtures', label: 'FIXTURES' },
  { id: 'training', label: 'TRAINING' },
  { id: 'friendlies', label: 'FRIENDLIES' },
  { id: 'other', label: 'OTHER' },
];

export default function CalendarEventsMobile() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<DatabaseEvent[]>([]);
  const [activeTab, setActiveTab] = useState('fixtures');
  const [loading, setLoading] = useState(true);
  const [eventsToShow, setEventsToShow] = useState(5);
  const showMoreIncrement = 5;
  const [selectedEvent, setSelectedEvent] = useState<DatabaseEvent | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showMobileEventForm, setShowMobileEventForm] = useState(false);
  const [showTeamSelection, setShowTeamSelection] = useState(false);
  const [showPostGameEdit, setShowPostGameEdit] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [showExpandedTeamSelection, setShowExpandedTeamSelection] = useState(false);
  const [eventSelections, setEventSelections] = useState<{[key: string]: any[]}>({});
  const [userAvailability, setUserAvailability] = useState<UserAvailabilityStatus[]>([]);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showManageConnections, setShowManageConnections] = useState(false);
  const [pendingAvailability, setPendingAvailability] = useState<any[]>([]);
  const [eventTimeContexts, setEventTimeContexts] = useState<{[eventId: string]: UserTeamContext}>({});
  const [invitedEventIds, setInvitedEventIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { filteredTeams: teams } = useClubContext();
  const { currentTeam, viewMode, availableTeams } = useTeamContext();
  const { hasPermission } = useAuthorization();

  // Swipe detection state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Swipe functionality
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe || isRightSwipe) {
      const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
      
      if (isLeftSwipe && currentIndex < tabs.length - 1) {
        // Swipe left - go to next tab
        setActiveTab(tabs[currentIndex + 1].id);
      } else if (isRightSwipe && currentIndex > 0) {
        // Swipe right - go to previous tab
        setActiveTab(tabs[currentIndex - 1].id);
      }
    }
  };

  // Check if user can create events (admin or manager roles only)
  const canCreateEvents = () => {
    if (!profile?.roles) return false;
    const allowedRoles = ['global_admin', 'club_admin', 'manager', 'team_manager'];
    return profile.roles.some(role => allowedRoles.includes(role));
  };

  // Check if user can edit events (not parent or player)
  const canEditEvents = () => {
    if (!profile?.roles) return false;
    // Allow editing if user has any management/coaching roles
    const canEditRoles = ['global_admin', 'club_admin', 'manager', 'team_manager', 'coach', 'staff'];
    return profile.roles.some(role => canEditRoles.includes(role));
  };

  useEffect(() => {
    loadEvents();
  }, [currentTeam, viewMode, availableTeams]);

  useEffect(() => {
    if (events.length > 0 && user?.id) {
      loadUserAvailability();
      loadPendingAvailability();
      loadEventTimeContexts();
      loadInvitedEvents();
    }
  }, [events, user?.id]);

  const loadPendingAvailability = async () => {
    try {
      if (!user?.id) return;

      const { data: pending } = await supabase
        .from('event_availability')
        .select(`
          *,
          events!inner(
            id, title, date, start_time, event_type, opponent
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      setPendingAvailability(pending || []);
    } catch (error) {
      console.error('Error loading pending availability:', error);
    }
  };

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
    console.log(`Availability status for event ${eventId.slice(-6)}:`, status);
    return status;
  };

  const getEventBorderClass = (eventId: string): string => {
    const status = getAvailabilityStatus(eventId);
    
    switch (status) {
      case 'available':
        return 'border-l-green-500 border-l-4';
      case 'unavailable':
        return 'border-l-red-500 border-l-4';
      case 'pending':
        return 'border-l-amber-500 border-l-4';
      default:
        return 'border-l-gray-300 border-l-4';
    }
  };

  const loadEvents = async () => {
    try {
      // Determine which teams to query based on view mode
      const teamsToQuery = viewMode === 'all' ? availableTeams : (currentTeam ? [currentTeam] : []);
      
      if (teamsToQuery.length === 0) return;

      const teamIds = teamsToQuery.map(t => t.id);

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .in('team_id', teamIds)
        .order('date', { ascending: false });

      if (error) throw error;
      console.log('Loaded events:', data?.length, 'View mode:', viewMode);
      setEvents((data || []) as DatabaseEvent[]);
      
      // Load event selections to get proper performance category mappings
      const { data: selectionsData, error: selectionsError } = await supabase
        .from('event_selections')
        .select(`
          event_id,
          team_number,
          team_id,
          performance_category_id,
          performance_categories!inner(name)
        `)
        .in('team_id', teamIds);

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
        }, eventData.invitations);
        
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
        }, eventData.invitations);
        
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

  const shouldShowAvailabilityControls = (event: DatabaseEvent) => {
    // Show availability controls for future events only AND if user was invited
    const eventDate = new Date(event.date);
    const isFutureEvent = eventDate >= new Date() || isToday(eventDate);
    const isInvited = invitedEventIds.has(event.id);
    return isFutureEvent && isInvited;
  };

  const loadInvitedEvents = async () => {
    if (!user?.id || events.length === 0) return;

    try {
      const invitedIds = new Set<string>();
      
      // Check each event to see if user is invited
      for (const event of events) {
        const isInvited = await multiRoleAvailabilityService.isUserInvitedToEvent(event.id, user.id);
        if (isInvited) {
          invitedIds.add(event.id);
        }
      }
      
      setInvitedEventIds(invitedIds);
    } catch (error) {
      console.error('Error loading invited events:', error);
    }
  };

  const loadEventTimeContexts = async () => {
    if (!user?.id || events.length === 0) return;

    try {
      const contexts: {[eventId: string]: UserTeamContext} = {};
      
      for (const event of events) {
        const context = await getUserContextForEvent(event, user.id);
        contexts[event.id] = context;
      }
      
      setEventTimeContexts(contexts);
    } catch (error) {
      console.error('Error loading event time contexts:', error);
    }
  };

  const handleAvailabilityChange = (eventId: string, status: 'available' | 'unavailable') => {
    // Update local state to reflect the change immediately
    setUserAvailability(prev => {
      const existing = prev.find(a => a.eventId === eventId);
      if (existing) {
        return prev.map(a => a.eventId === eventId ? { ...a, status } : a);
      } else {
        return [...prev, { eventId, status, source: 'direct' }];
      }
    });
  };

  const getFilteredEvents = () => {
    return events.filter(event => {
      switch (activeTab) {
        case 'fixtures':
          return ['match', 'fixture'].includes(event.event_type);
        case 'training':
          return event.event_type === 'training';
        case 'friendlies':
          return event.event_type === 'friendly';
        case 'other':
          return !['match', 'fixture', 'training', 'friendly'].includes(event.event_type);
        default:
          return true;
      }
    });
  };

  const groupEventsByMonth = (events: DatabaseEvent[]) => {
    const grouped: { [key: string]: DatabaseEvent[] } = {};
    
    events.forEach(event => {
      const monthKey = format(new Date(event.date), 'MMMM yyyy');
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(event);
    });
    
    return grouped;
  };

  const isMatchType = (eventType: string) => {
    return ['match', 'fixture', 'friendly'].includes(eventType);
  };

  const isEventCompleted = (event: DatabaseEvent) => {
    return isEventPast(event);
  };

  const getAllTeamScores = (event: DatabaseEvent) => {
    if (!event.scores || !isMatchType(event.event_type)) return [];
    
    const scores = [];
    const scoresData = event.scores as any;
    const selections = eventSelections[event.id] || [];
    
    // Check for team_1, team_2, etc. (performance category teams)
    let teamNumber = 1;
    while (scoresData[`team_${teamNumber}`] !== undefined) {
      const ourScore = scoresData[`team_${teamNumber}`];
      const opponentScore = scoresData[`opponent_${teamNumber}`];
      
      // Find the correct performance category for this team number
      const selection = selections.find(s => s.team_number === teamNumber);
      const teamName = selection?.performance_categories?.name || `Team ${teamNumber}`;
      
      let outcome = 'draw';
      let outcomeIcon = '🤝';
      
      if (ourScore > opponentScore) {
        outcome = 'win';
        outcomeIcon = '🏆';
      } else if (ourScore < opponentScore) {
        outcome = 'loss';
        outcomeIcon = '❌';
      }
      
      scores.push({
        teamNumber,
        teamName,
        ourScore,
        opponentScore,
        outcome,
        outcomeIcon
      });
      
      teamNumber++;
    }
    
    // Fallback to home/away scores if no team scores found
    if (scores.length === 0 && scoresData.home !== undefined && scoresData.away !== undefined) {
      const ourScore = event.is_home ? scoresData.home : scoresData.away;
      const opponentScore = event.is_home ? scoresData.away : scoresData.home;
      
      let outcome = 'draw';
      let outcomeIcon = '🤝';
      
      if (ourScore > opponentScore) {
        outcome = 'win';
        outcomeIcon = '🏆';
      } else if (ourScore < opponentScore) {
        outcome = 'loss';
        outcomeIcon = '❌';
      }
      
      scores.push({
        teamNumber: 1,
        teamName: teams?.[0]?.name || 'Team',
        ourScore,
        opponentScore,
        outcome,
        outcomeIcon
      });
    }
    
    return scores;
  };

  const handleEventClick = (event: DatabaseEvent, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setSelectedEvent(event);
    setShowEventDetails(true);
  };

  const handleEventAction = (event: DatabaseEvent, action: 'setup' | 'squad' | 'report', e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
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

  const getEventTypeBadgeColor = (eventType: string) => {
    switch (eventType) {
      case 'fixture':
      case 'match':
        return 'bg-blue-500';
      case 'friendly':
        return 'bg-green-500';
      case 'training':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Get user-relevant time display for mobile calendar cards
  const getUserRelevantTimeDisplay = (event: DatabaseEvent): string => {
    const context = eventTimeContexts[event.id];
    if (!context) {
      return event.start_time || 'TBD';
    }

    // Always show the user's specific time, never "Multiple Times"
    return formatEventTimeDisplay(context);
  };

  const getEventTeamTimes = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('event_teams')
        .select('team_number, start_time, meeting_time')
        .eq('event_id', eventId)
        .order('team_number');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading event team times:', error);
      return [];
    }
  };

  const filteredEvents = getFilteredEvents();
  
  // Separate upcoming and past events
  const now = new Date();
  const upcomingEvents = filteredEvents.filter(event => new Date(event.date) >= now);
  const pastEvents = filteredEvents.filter(event => new Date(event.date) < now);
  
  // Sort upcoming events by date (ascending - closest first)
  const sortedUpcomingEvents = upcomingEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Sort past events by date (descending - most recent first)  
  const sortedPastEvents = pastEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // Combine with upcoming first, then past
  const orderedEvents = [...sortedUpcomingEvents, ...sortedPastEvents];
  
  // Apply pagination
  const paginatedEvents = orderedEvents.slice(0, eventsToShow);
  const hasMoreEvents = orderedEvents.length > eventsToShow;
  
  // Find next upcoming event for highlighting
  const nextUpcomingEvent = sortedUpcomingEvents[0];
  
  const groupedEvents = groupEventsByMonth(paginatedEvents);

  if (showExpandedTeamSelection && selectedEvent) {
    return (
      <MobileLayout>
        <div className="p-4">
          <MobileTeamSelectionView
            event={selectedEvent}
            teamId={teams?.[0]?.id || ''}
            onOpenFullManager={() => {
              setShowExpandedTeamSelection(false);
              setShowTeamSelection(true);
            }}
            onClose={() => {
              setShowExpandedTeamSelection(false);
              setSelectedEvent(null);
            }}
            isExpanded={true}
          />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout 
      showTabs={true}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      tabs={tabs}
      stickyTabs={true}
    >
      <div 
        className="space-y-6 pb-8"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pending Availability - First Priority */}
        {pendingAvailability.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-orange-600" />
                Availability Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingAvailability.slice(0, 2).map((availability) => (
                <div key={availability.id} className="flex items-center justify-between p-3 rounded-lg bg-white border border-orange-200">
                  <div>
                    <div className="font-medium">
                      {availability.events.event_type === 'training' 
                        ? availability.events.title 
                        : `vs ${availability.events.opponent || 'TBD'}`}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(availability.events.date).toLocaleDateString()}
                      {availability.events.start_time && `, ${availability.events.start_time}`}
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-orange-100 text-orange-700">
                    Response Needed
                  </Badge>
                </div>
              ))}
              {pendingAvailability.length > 2 && (
                <p className="text-sm text-center text-muted-foreground">
                  +{pendingAvailability.length - 2} more requests
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading events...</p>
          </div>
        ) : paginatedEvents.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No {activeTab} scheduled</p>
          </div>
        ) : (
          <>
            {Object.entries(groupedEvents).map(([month, monthEvents]) => (
              <div key={month} className="space-y-3">
                <h2 className="text-sm font-medium text-gray-600 uppercase tracking-wider px-1">
                  {month}
                </h2>
                
                <div className="space-y-3">
                  {monthEvents.map((event) => {
                    const team = teams?.find(t => t.id === event.team_id);
                    const kitDesign = team?.kitDesigns?.[event.kit_selection as 'home' | 'away' | 'training'];
                    const completed = isEventCompleted(event);
                    const eventDate = new Date(event.date);
                    const isEventToday = isToday(eventDate);
                    const isEventPast = isPast(startOfDay(eventDate)) && !isEventToday;
                    const teamScores = getAllTeamScores(event);
                    const borderClass = getEventBorderClass(event.id);
                    const availabilityStatus = getAvailabilityStatus(event.id);
                    const showAvailabilityControls = shouldShowAvailabilityControls(event);
                    const isNextEvent = nextUpcomingEvent && event.id === nextUpcomingEvent.id;
                    
                    return (
                      <Card 
                        key={event.id} 
                        className={`bg-white shadow-sm cursor-pointer hover:shadow-md transition-shadow ${borderClass} ${
                          isNextEvent ? 'ring-2 ring-primary/50 shadow-lg' : ''
                        }`}
                        onClick={(e) => handleEventClick(event, e)}
                      >
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            {/* Next Event Badge */}
                            {isNextEvent && (
                              <div className="flex justify-center">
                                <Badge className="bg-primary text-primary-foreground text-xs px-2 py-1">
                                  NEXT EVENT
                                </Badge>
                              </div>
                            )}
                            
                            {/* Date and Time */}
                            <div className="flex items-center justify-between">
                              <div className="text-center">
                                <div className="text-xs text-gray-500 uppercase">
                                  {format(eventDate, 'EEE dd MMM')}
                                </div>
                                <div className="text-lg font-bold text-gray-900">
                                  {getUserRelevantTimeDisplay(event)}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {/* Result icons for completed matches - show ALL team results */}
                                {completed && teamScores.length > 0 && (
                                  <div className="flex gap-1">
                                    {teamScores.map((score, index) => (
                                      <span key={index} className="text-lg">{score.outcomeIcon}</span>
                                    ))}
                                  </div>
                                )}
                                
                                {/* Kit avatar */}
                                {kitDesign && (
                                  <EnhancedKitAvatar design={kitDesign} size="sm" />
                                )}
                              </div>
                            </div>

                            {/* Teams/Title */}
                            <div className="text-center">
                              {isMatchType(event.event_type) && event.opponent ? (
                                <div className="flex items-center justify-center gap-3">
                                  <div className="flex items-center gap-2">
                                    {team?.logoUrl && (
                                      <img 
                                        src={team.logoUrl} 
                                        alt={team.name}
                                        className="w-8 h-8 rounded-full"
                                      />
                                    )}
                                  </div>
                                  <span className="text-gray-400">vs</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">{event.opponent}</span>
                                  </div>
                                </div>
                              ) : (
                                <h3 className="font-medium text-gray-900">{event.title}</h3>
                              )}
                            </div>

                            {/* Location and Details */}
                            {event.location && (
                              <div className="text-xs text-gray-500 text-center">
                                {event.location}
                              </div>
                            )}

                            {/* Match Info */}
                            {isMatchType(event.event_type) && (
                              <div className="text-xs text-gray-500 text-center">
                                {event.game_format || 'Match'} • {event.is_home ? 'Home' : 'Away'}
                              </div>
                            )}

                            {/* Multi-Role Availability Controls */}
                            {shouldShowAvailabilityControls(event) && (
                              <div className="pt-2 border-t">
                                 <MultiRoleAvailabilityControls
                                   eventId={event.id}
                                   size="sm"
                                 />
                                 
                                 {/* Debug Helper - Only show for Chris McDonald when no staff role detected */}
                                 {user?.email === 'chrisjpmcdonald@gmail.com' && !getAvailabilityStatus(event.id) && (
                                   <div className="mt-2 pt-2 border-t">
                                     <StaffAssignmentHelper
                                       eventId={event.id}
                                       staffId="dbc26381-a72b-417a-92e0-061d9a552026"
                                       onSuccess={() => {
                                         // Refresh the page to reload roles
                                         window.location.reload();
                                       }}
                                     />
                                   </div>
                                 )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
            
            {/* Show More Button */}
            {hasMoreEvents && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => setEventsToShow(prev => prev + showMoreIncrement)}
                  className="px-6"
                >
                  Show More ({Math.min(showMoreIncrement, orderedEvents.length - eventsToShow)} more)
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Mobile Event Form Modal */}
      {showMobileEventForm && (
        <MobileEventForm
          onClose={() => setShowMobileEventForm(false)}
          onEventCreated={() => {
            setShowMobileEventForm(false);
            loadEvents();
          }}
        />
      )}

      {/* Event Details Modal */}
      <Dialog open={showEventDetails} onOpenChange={setShowEventDetails}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge className={`text-white ${getEventTypeBadgeColor(selectedEvent.event_type)}`}>
                  {selectedEvent.event_type.charAt(0).toUpperCase() + selectedEvent.event_type.slice(1)}
                </Badge>
                {getAvailabilityStatus(selectedEvent.id) && (
                  <AvailabilityStatusBadge status={getAvailabilityStatus(selectedEvent.id)!} size="md" />
                )}
              </div>
              
              <div>
                <h3 className="font-semibold text-lg">
                  {isMatchType(selectedEvent.event_type) && selectedEvent.opponent 
                    ? `${teams?.[0]?.name} vs ${selectedEvent.opponent}`
                    : selectedEvent.title
                  }
                </h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>{format(new Date(selectedEvent.date), 'EEEE, MMMM do, yyyy')}</span>
                </div>
                
                {/* Show team times for multi-team events */}
                <EventTeamTimesDisplay eventId={selectedEvent.id} />
                
                {selectedEvent.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span>{selectedEvent.location}</span>
                  </div>
                )}
                
                {isMatchType(selectedEvent.event_type) && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span>
                      {selectedEvent.game_format || 'Match'} • {selectedEvent.is_home ? 'Home' : 'Away'}
                    </span>
                  </div>
                )}
              </div>

              {/* Show scores for all teams using performance category names */}
              {getAllTeamScores(selectedEvent).length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Scores</h4>
                  <div className="space-y-2">
                    {getAllTeamScores(selectedEvent).map((score, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm font-medium">{score.teamName}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{score.ourScore} - {score.opponentScore}</span>
                          <Badge 
                            variant={score.outcome === 'win' ? 'default' : score.outcome === 'loss' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {score.outcome?.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Team Selection Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Team Selection
                  </h4>
                  {canEditEvents() && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setShowEventDetails(false);
                        setShowExpandedTeamSelection(true);
                      }}
                    >
                      View Full
                    </Button>
                  )}
                </div>
                <MobileTeamSelectionView
                  event={selectedEvent}
                  teamId={teams?.[0]?.id || ''}
                  onOpenFullManager={() => {
                    setShowEventDetails(false);
                    setShowTeamSelection(true);
                  }}
                />
              </div>
              
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
              
              {selectedEvent.coach_notes && (
                <div>
                  <h4 className="font-medium mb-2">Coach Notes</h4>
                  <p className="text-sm text-gray-600">{selectedEvent.coach_notes}</p>
                </div>
              )}
              
              {selectedEvent.training_notes && (
                <div>
                  <h4 className="font-medium mb-2">Training Notes</h4>
                  <p className="text-sm text-gray-600">{selectedEvent.training_notes}</p>
                </div>
              )}
              
              {canEditEvents() && (
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
                  {(selectedEvent.event_type === 'match' || selectedEvent.event_type === 'friendly' || selectedEvent.event_type === 'fixture') && (
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setShowEventDetails(false);
                        navigate(`/game-day/${selectedEvent.id}`);
                      }}
                    >
                      GAME DAY
                    </Button>
                  )}
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
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Event Form Modal */}
      <Dialog open={showEventForm} onOpenChange={setShowEventForm}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedEvent ? 'Edit Event' : 'Create Event'}
            </DialogTitle>
          </DialogHeader>
          <EventForm
            event={convertToEventFormat(selectedEvent)}
            teamId={teams?.[0]?.id || ''}
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

      {/* Profile and Connection Modals */}
      <EditProfileModal 
        isOpen={showEditProfile} 
        onClose={() => setShowEditProfile(false)} 
      />
      <ManageConnectionsModal 
        isOpen={showManageConnections} 
        onClose={() => setShowManageConnections(false)} 
      />
    </MobileLayout>
  );
}

// Component to display team-specific times in event details
const EventTeamTimesDisplay = ({ eventId }: { eventId: string }) => {
  const [teamTimes, setTeamTimes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '';
    try {
      return format(new Date(`2000-01-01T${timeStr}`), 'h:mm a');
    } catch (error) {
      return timeStr;
    }
  };

  useEffect(() => {
    const loadTeamTimes = async () => {
      try {
        const { data, error } = await supabase
          .from('event_teams')
          .select('team_number, start_time, meeting_time')
          .eq('event_id', eventId)
          .order('team_number');

        if (error) throw error;
        setTeamTimes(data || []);
      } catch (error) {
        console.error('Error loading team times:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTeamTimes();
  }, [eventId]);

  if (loading) return null;
  
  if (teamTimes.length <= 1) {
    // Single team or no teams - show regular time display
    const singleTeam = teamTimes[0];
    if (singleTeam?.start_time || singleTeam?.meeting_time) {
      return (
        <div className="text-sm">
          {singleTeam.meeting_time && singleTeam.start_time ? (
            <div className="space-y-1">
              <div>Meet: {formatTime(singleTeam.meeting_time)}</div>
              <div>Start: {formatTime(singleTeam.start_time)}</div>
            </div>
          ) : (
            <div>Start: {formatTime(singleTeam.start_time) || 'TBD'}</div>
          )}
        </div>
      );
    }
    return null;
  }

  // Multiple teams - show all team times
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">
        <span>Team Times</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {teamTimes.map((team) => (
          <div key={team.team_number} className="text-sm text-gray-600">
            <div className="font-medium mb-1">Team {team.team_number}:</div>
            {team.meeting_time && team.start_time ? (
              <div className="space-y-1">
                <div>Meet: {formatTime(team.meeting_time)}</div>
                <div>Start: {formatTime(team.start_time)}</div>
              </div>
            ) : team.start_time ? (
              <div>Start: {formatTime(team.start_time)}</div>
            ) : (
              <div>Time TBD</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
