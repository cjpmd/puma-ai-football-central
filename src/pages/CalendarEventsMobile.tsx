import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format, isSameDay, isToday, isTomorrow, isPast, parseISO, startOfDay, endOfWeek, addWeeks } from 'date-fns';
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
import { FPLShirtIcon } from '@/components/shared/FPLShirtIcon';
import { Calendar, Clock, MapPin, Users, User, Link2, AlertCircle, Plus, UserCheck, Shirt } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KitDesign } from '@/types/team';
import { EventLocationMap } from '@/components/events/EventLocationMap';
import { EventWeatherDisplay } from '@/components/events/EventWeatherDisplay';
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
import { EventAvailabilitySection } from '@/components/events/EventAvailabilitySection';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';

// Helper to get color-coded event type label
const getEventTypeLabel = (eventType: string): { label: string; colorClass: string } => {
  switch (eventType) {
    case 'fixture':
    case 'match':
      return { label: 'Fixture', colorClass: 'text-blue-600' };
    case 'friendly':
      return { label: 'Friendly', colorClass: 'text-green-600' };
    case 'training':
      return { label: 'Training', colorClass: 'text-purple-600' };
    case 'tournament':
      return { label: 'Tournament', colorClass: 'text-orange-600' };
    case 'festival':
      return { label: 'Festival', colorClass: 'text-amber-600' };
    default:
      return { label: eventType.charAt(0).toUpperCase() + eventType.slice(1), colorClass: 'text-muted-foreground' };
  }
};

export default function CalendarEventsMobile() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = React.useState(() => new URLSearchParams(window.location.search));
  const [events, setEvents] = useState<DatabaseEvent[]>([]);
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
  const [selectedTeamIndex, setSelectedTeamIndex] = useState(0);
  const [teamRefreshTrigger, setTeamRefreshTrigger] = useState(0);
  const [teamPrivacySettings, setTeamPrivacySettings] = useState<Map<string, any>>(new Map());
  const { toast } = useToast();
  const { user, profile, teams: authTeams, allTeams } = useAuth();
  const { filteredTeams: teams } = useClubContext();
  const { currentTeam, viewMode, availableTeams } = useTeamContext();
  const { hasPermission } = useAuthorization();
  const { hasStaffAccess, isRestrictedParent, isRestrictedPlayer } = useEffectiveRole();

  // Helper to check if scores should be shown for an event
  const shouldShowScoresForEvent = (event: DatabaseEvent) => {
    if (hasStaffAccess) return true;
    const settings = teamPrivacySettings.get(event.team_id);
    if (!settings) return true;
    if (isRestrictedParent && !settings.show_scores_to_parents) return false;
    if (isRestrictedPlayer && !settings.show_scores_to_players) return false;
    return true;
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

  // Handle eventId from URL (e.g., from Dashboard click)
  useEffect(() => {
    const eventIdFromUrl = searchParams.get('eventId');
    if (eventIdFromUrl && events.length > 0 && !showEventDetails) {
      const event = events.find(e => e.id === eventIdFromUrl);
      if (event) {
        setSelectedEvent(event);
        setShowEventDetails(true);
        // Clear the URL param to prevent re-opening on navigation
        window.history.replaceState({}, '', window.location.pathname);
        setSearchParams(new URLSearchParams());
      }
    }
  }, [events, searchParams]);

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

      // Get ALL availability records for user (not just pending)
      // to properly handle multi-role scenarios
      const { data: allAvailability } = await supabase
        .from('event_availability')
        .select(`
          *,
          events!inner(
            id, title, date, start_time, event_type, opponent
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Group by event and check if ALL roles are pending
      // If user has responded to at least one role, don't count as unanswered
      const eventGroups = new Map<string, any[]>();
      allAvailability?.forEach(record => {
        const existing = eventGroups.get(record.event_id) || [];
        existing.push(record);
        eventGroups.set(record.event_id, existing);
      });

      // Only include events where ALL roles are still pending
      const pendingEvents = Array.from(eventGroups.entries())
        .filter(([_, records]) => records.every(r => r.status === 'pending'))
        .map(([_, records]) => records[0]); // Return first record for display

      setPendingAvailability(pendingEvents);
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
      // For "all" view mode, use ALL teams from AuthContext (across all clubs)
      // For single team mode, use currentTeam directly
      const teamsToQuery = viewMode === 'all' 
        ? (authTeams?.length ? authTeams : allTeams || [])
        : (currentTeam ? [currentTeam] : []);
      
      if (teamsToQuery.length === 0) return;

      const teamIds = teamsToQuery.map(t => t.id);

      // Load privacy settings for all teams
      const { data: privacyData } = await supabase
        .from('team_privacy_settings')
        .select('team_id, show_scores_to_parents, show_scores_to_players')
        .in('team_id', teamIds);
      
      const settingsMap = new Map<string, any>();
      privacyData?.forEach(setting => {
        settingsMap.set(setting.team_id, setting);
      });
      setTeamPrivacySettings(settingsMap);

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
        return [...prev, { eventId, status, source: 'player' as const }];
      }
    });
  };

  const handleAddTeam = async () => {
    if (!selectedEvent || !teams?.[0]?.id) return;
    
    try {
      // Get current team count
      const { data: existingSelections } = await supabase
        .from('event_selections')
        .select('team_number')
        .eq('event_id', selectedEvent.id)
        .eq('team_id', teams[0].id);
      
      const teamNumbers = existingSelections?.map(s => s.team_number) || [];
      const newTeamNumber = teamNumbers.length > 0 ? Math.max(...teamNumbers) + 1 : 1;
      
      // Insert new team selection
      const { error } = await supabase
        .from('event_selections')
        .insert({
          event_id: selectedEvent.id,
          team_id: teams[0].id,
          team_number: newTeamNumber,
          period_number: 1,
          formation: '4-3-3',
          duration_minutes: selectedEvent.game_duration || 50,
          player_positions: [],
          substitutes: []
        });
      
      if (error) throw error;
      
      // Update event teams array
      const newTeamsArray = [...teamNumbers.map(String), newTeamNumber.toString()];
      await supabase
        .from('events')
        .update({ teams: newTeamsArray })
        .eq('id', selectedEvent.id);
      
      toast({ title: 'Team added successfully' });
      setTeamRefreshTrigger(prev => prev + 1);
      loadEvents();
    } catch (error) {
      console.error('Error adding team:', error);
      toast({ title: 'Failed to add team', variant: 'destructive' });
    }
  };

  // Show all events (no filtering by type)
  const getFilteredEvents = () => events;

  const groupEventsByPeriod = (events: DatabaseEvent[]) => {
    const now = new Date();
    const endOfThisWeek = endOfWeek(now, { weekStartsOn: 1 });
    const endOfNextWeek = addWeeks(endOfThisWeek, 1);
    
    const grouped: { [key: string]: DatabaseEvent[] } = {};
    
    events.forEach(event => {
      const eventDate = new Date(event.date);
      let periodKey: string;
      
      if (eventDate <= endOfThisWeek && eventDate >= now) {
        periodKey = 'This week';
      } else if (eventDate <= endOfNextWeek && eventDate > endOfThisWeek) {
        periodKey = 'Next week';
      } else if (eventDate < now) {
        periodKey = 'Past events';
      } else {
        periodKey = format(eventDate, 'MMMM');
      }
      
      if (!grouped[periodKey]) {
        grouped[periodKey] = [];
      }
      grouped[periodKey].push(event);
    });
    
    return grouped;
  };

  // Get conversational time display
  const getConversationalTime = (event: DatabaseEvent): string => {
    const eventDate = new Date(event.date);
    const time = event.start_time ? formatTime(event.start_time) : 'TBD';
    
    if (isToday(eventDate)) return `Today at ${time}`;
    if (isTomorrow(eventDate)) return `Tomorrow at ${time}`;
    
    // Within next 7 days - show day name
    const daysDiff = Math.ceil((eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 0 && daysDiff <= 7) {
      return `${format(eventDate, 'EEEE')} at ${time}`;
    }
    
    // Further out - show full date
    return `${format(eventDate, 'EEE d MMM')} at ${time}`;
  };

  // Get border color based on event type or availability
  const getAccentColor = (event: DatabaseEvent): string => {
    const status = getAvailabilityStatus(event.id);
    
    switch (status) {
      case 'available':
        return 'bg-green-500';
      case 'unavailable':
        return 'bg-red-500';
      case 'pending':
        return 'bg-amber-500';
      default:
        // Fall back to event type colors
        switch (event.event_type) {
          case 'fixture':
          case 'match':
            return 'bg-blue-500';
          case 'friendly':
            return 'bg-green-500';
          case 'training':
            return 'bg-purple-500';
          default:
            return 'bg-gray-400';
        }
    }
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

  // Get kit design from team based on selection
  const getKitDesign = (selection: 'home' | 'away' | 'training' | undefined): KitDesign | undefined => {
    const team = teams?.[0];
    if (!team?.kitDesigns) return undefined;
    const kitDesigns = team.kitDesigns as Record<string, KitDesign>;
    return kitDesigns[selection || 'home'] || kitDesigns.home;
  };

  // Handle kit selection change
  const handleKitChange = async (kitSelection: 'home' | 'away' | 'training') => {
    if (!selectedEvent) return;
    
    try {
      const { error } = await supabase
        .from('events')
        .update({ kit_selection: kitSelection })
        .eq('id', selectedEvent.id);
      
      if (error) throw error;
      
      setSelectedEvent(prev => prev ? { ...prev, kit_selection: kitSelection } : null);
      toast({ title: 'Kit updated' });
    } catch (error) {
      console.error('Error updating kit:', error);
      toast({ title: 'Failed to update kit', variant: 'destructive' });
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
  
  const groupedEvents = groupEventsByPeriod(paginatedEvents);

  if (showExpandedTeamSelection && selectedEvent) {
    return (
      <MobileLayout>
        <div className="p-4">
          <MobileTeamSelectionView
            event={selectedEvent}
            teamId={teams?.[0]?.id || ''}
            teamName={teams?.[0]?.name}
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
    <MobileLayout>
      <div className="space-y-4 pb-8 px-1">
        {/* Pending Availability - First Priority (filtered to exclude past events) */}
        {(() => {
          const futurePendingAvailability = pendingAvailability.filter(availability => {
            const eventData: DatabaseEvent = {
              ...availability.events,
              id: availability.events.id,
              date: availability.events.date,
              start_time: availability.events.start_time,
              end_time: availability.events.end_time,
            };
            return !isEventPast(eventData);
          });
          
          if (futurePendingAvailability.length === 0) return null;
          
          const handleAvailabilityClick = (availability: any) => {
            // Find the full event from events array or create a minimal one from availability data
            const fullEvent = events.find(e => e.id === availability.event_id) || availability.events;
            setSelectedEvent(fullEvent);
            setShowEventDetails(true);
          };
          
          return (
            <div className="bg-card rounded-lg border p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-medium text-red-600">
                  {futurePendingAvailability.length} unanswered event{futurePendingAvailability.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-2">
                {futurePendingAvailability.slice(0, 2).map((availability) => (
                  <div 
                    key={availability.id} 
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => handleAvailabilityClick(availability)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">
                        {availability.events.event_type === 'training' 
                          ? availability.events.title 
                          : `vs ${availability.events.opponent || 'TBD'}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(availability.events.date), 'EEE d MMM')}
                        {availability.events.start_time && ` at ${formatTime(availability.events.start_time)}`}
                      </div>
                    </div>
                  </div>
                ))}
                {futurePendingAvailability.length > 2 && (
                  <p className="text-xs text-center text-muted-foreground pt-1">
                    +{futurePendingAvailability.length - 2} more
                  </p>
                )}
              </div>
            </div>
          );
        })()}

        {loading ? (
          <div className="text-center py-8">
            <LoadingSpinner size="md" message="Loading events..." />
          </div>
        ) : paginatedEvents.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No events scheduled</p>
          </div>
        ) : (
          <>
            {Object.entries(groupedEvents).map(([period, periodEvents]) => (
              <div key={period} className="space-y-2">
                <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
                  {period}
                </h2>
                
                <div className="space-y-2">
                  {periodEvents.map((event) => {
                    // Use allTeams/authTeams for badge lookup to cover all clubs in "All Teams" view
                    const team = (allTeams || authTeams || []).find(t => t.id === event.team_id) 
                      || teams?.find(t => t.id === event.team_id);
                    const completed = isEventCompleted(event);
                    const eventDate = new Date(event.date);
                    const teamScores = getAllTeamScores(event);
                    const isNextEvent = nextUpcomingEvent && event.id === nextUpcomingEvent.id;
                    const accentColor = getAccentColor(event);
                    
                    return (
                    <Card 
                      key={event.id} 
                      className={`bg-card shadow-none border cursor-pointer hover:bg-accent/50 transition-colors relative ${
                        isNextEvent ? 'ring-2 ring-primary shadow-sm' : ''
                      }`}
                        onClick={(e) => handleEventClick(event, e)}
                      >
                        <CardContent className="p-3">
                          <div className="flex gap-3">
                            {/* Left: Date Column */}
                            <div className="flex flex-col items-center justify-center min-w-[40px]">
                              <span className="text-[10px] uppercase font-medium text-muted-foreground">
                                {format(eventDate, 'MMM')}
                              </span>
                              <span className="text-xl font-bold text-foreground leading-tight">
                                {format(eventDate, 'd')}
                              </span>
                            </div>
                            
                            {/* Colored accent bar */}
                            <div className={`w-1 self-stretch rounded-full ${accentColor}`} />
                            
                            {/* Right: Event Details */}
                            <div className="flex-1 min-w-0 space-y-0.5">
                              {/* Event Title with Color-Coded Type */}
                              <h3 className="font-semibold truncate text-sm">
                                <span className={`${getEventTypeLabel(event.event_type).colorClass} mr-1`}>
                                  {getEventTypeLabel(event.event_type).label}
                                </span>
                                <span className="text-foreground">
                                  {isMatchType(event.event_type) && event.opponent 
                                    ? `vs ${event.opponent}`
                                    : event.event_type !== 'training' ? event.title : ''
                                  }
                                </span>
                              </h3>
                              
                              {/* Conversational Time */}
                              <p className="text-xs text-muted-foreground">
                                {getConversationalTime(event)}
                              </p>
                              
                              {/* Team Name */}
                              <p className="text-xs text-muted-foreground truncate">
                                {team?.name}
                              </p>
                              
                              {/* Scores for completed matches - respect privacy settings */}
                              {completed && teamScores.length > 0 && shouldShowScoresForEvent(event) && (
                                <div className="flex items-center gap-2 pt-1">
                                  {teamScores.map((score, index) => (
                                    <div key={index} className="flex items-center gap-1">
                                      <span className="text-xs font-medium">
                                        {score.ourScore} - {score.opponentScore}
                                      </span>
                                      <span className="text-sm">{score.outcomeIcon}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {/* Availability status indicator removed - now in Event Details */}
                            </div>
                            
                            {/* NEXT badge - absolute top right */}
                            {isNextEvent && (
                              <Badge className="bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full absolute top-2 right-2">
                                NEXT
                              </Badge>
                            )}
                            
                            {/* Team badge - absolute bottom right when viewing all teams */}
                            {viewMode === 'all' && team && (
                              <Avatar className="h-6 w-6 absolute bottom-2 right-2">
                                <AvatarImage src={team.logoUrl} alt={team.name} />
                                <AvatarFallback className="text-[8px] bg-muted">
                                  {team.name?.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
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
        <DialogContent className="w-full max-w-full sm:max-w-[425px] max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4 overflow-x-hidden">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`text-white ${getEventTypeBadgeColor(selectedEvent.event_type)}`}>
                  {selectedEvent.event_type.charAt(0).toUpperCase() + selectedEvent.event_type.slice(1)}
                </Badge>
                {getAvailabilityStatus(selectedEvent.id) && (
                  <AvailabilityStatusBadge status={getAvailabilityStatus(selectedEvent.id)!} size="md" />
                )}
              </div>
              
              <div>
                <h3 className="font-semibold text-lg break-words">
                  {isMatchType(selectedEvent.event_type) && selectedEvent.opponent 
                    ? `${teams?.[0]?.name} vs ${selectedEvent.opponent}`
                    : selectedEvent.title
                  }
                </h3>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(selectedEvent.date), 'EEE d MMM')}</span>
                  {selectedEvent.start_time && (
                    <>
                      <span>•</span>
                      <Clock className="h-4 w-4" />
                      <span>{selectedEvent.start_time.slice(0, 5)}</span>
                    </>
                  )}
                {isMatchType(selectedEvent.event_type) && (
                    <>
                      <span>•</span>
                      <span>{selectedEvent.is_home ? 'Home' : 'Away'}</span>
                    </>
                  )}
                </div>
                
                {/* Kit Selection for matches */}
                {isMatchType(selectedEvent.event_type) && (
                  <div className="flex items-center gap-2">
                    <FPLShirtIcon 
                      className="w-7 h-7 flex-shrink-0"
                      shirtColor={getKitDesign(selectedEvent.kit_selection as 'home' | 'away' | 'training')?.shirtColor}
                      stripeColor={getKitDesign(selectedEvent.kit_selection as 'home' | 'away' | 'training')?.stripeColor}
                      hasStripes={getKitDesign(selectedEvent.kit_selection as 'home' | 'away' | 'training')?.hasStripes}
                    />
                    <span className="text-sm text-muted-foreground capitalize">
                      {selectedEvent.kit_selection || 'home'} Kit
                    </span>
                  </div>
                )}
                
                {/* Show team times for multi-team events */}
                <EventTeamTimesDisplay eventId={selectedEvent.id} />
                
                {selectedEvent.location && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{selectedEvent.location}</span>
                    </div>
                    
                    {/* Map Display */}
                    <EventLocationMap 
                      location={selectedEvent.location}
                      lat={selectedEvent.latitude}
                      lng={selectedEvent.longitude}
                    />
                    
                    {/* Weather Display */}
                    <EventWeatherDisplay
                      lat={selectedEvent.latitude}
                      lng={selectedEvent.longitude}
                      eventDate={selectedEvent.date}
                    />
                  </div>
                )}
              </div>

              {/* Show scores for all teams using performance category names - respect privacy settings */}
              {selectedEvent && shouldShowScoresForEvent(selectedEvent) && getAllTeamScores(selectedEvent).length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Scores</h4>
                  <div className="space-y-2">
                    {getAllTeamScores(selectedEvent).map((score, index) => (
                      <div key={index} className="flex items-center justify-between gap-2 p-2 bg-muted rounded min-w-0">
                        <span className="text-sm font-medium truncate min-w-0 flex-1">{score.teamName}</span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-sm whitespace-nowrap">{score.ourScore} - {score.opponentScore}</span>
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

              {/* Your Availability Section */}
              {shouldShowAvailabilityControls(selectedEvent) && (
                <div className="border rounded-lg p-3 bg-muted/30">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Your Availability
                  </h4>
                  <MultiRoleAvailabilityControls
                    eventId={selectedEvent.id}
                    size="md"
                    onStatusChange={() => loadEvents()}
                  />
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
                      onClick={() => handleAddTeam()}
                      className="h-8 px-2"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <MobileTeamSelectionView
                  event={selectedEvent}
                  teamId={teams?.[0]?.id || ''}
                  teamName={teams?.[0]?.name}
                  onOpenFullManager={() => {
                    setShowEventDetails(false);
                    setShowTeamSelection(true);
                  }}
                  onTeamDeleted={() => {
                    // Force refresh the event details by reloading event
                    loadEvents();
                  }}
                  canEdit={canEditEvents()}
                  onTeamIndexChange={(index) => setSelectedTeamIndex(index)}
                  refreshTrigger={teamRefreshTrigger}
                />
              </div>

              {/* Availability Section */}
              <EventAvailabilitySection
                eventId={selectedEvent.id}
                teamId={teams?.[0]?.id || ''}
                canEdit={canEditEvents()}
              />
              
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
                <div className="grid grid-cols-3 gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEventAction(selectedEvent, 'setup')}
                  >
                    SETUP
                  </Button>
                  {(selectedEvent.event_type === 'match' || selectedEvent.event_type === 'friendly' || selectedEvent.event_type === 'fixture') && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        setShowEventDetails(false);
                        navigate(`/game-day/${selectedEvent.id}`);
                      }}
                    >
                      GAME DAY
                    </Button>
                  )}
                  {/* Report button - always show for matches, disabled until completed */}
                  {(selectedEvent.event_type === 'match' || selectedEvent.event_type === 'friendly' || selectedEvent.event_type === 'fixture') && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!isEventCompleted(selectedEvent)}
                      className={!isEventCompleted(selectedEvent) ? 'opacity-50' : ''}
                      onClick={() => handleEventAction(selectedEvent, 'report')}
                      title={!isEventCompleted(selectedEvent) ? 'Available after match' : 'Match Report'}
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
      <Dialog 
        open={showEventForm} 
        onOpenChange={(open) => {
          setShowEventForm(open);
          if (!open && selectedEvent) {
            setShowEventDetails(true);
          }
        }}
      >
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
              loadEvents();
              setShowEventDetails(true);
            }}
            onCancel={() => {
              setShowEventForm(false);
              setShowEventDetails(true);
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
            setShowEventDetails(true);
          }}
          initialTeamIndex={selectedTeamIndex}
        />
      )}

      {/* Post Game Edit Modal */}
      <Dialog 
        open={showPostGameEdit} 
        onOpenChange={(open) => {
          setShowPostGameEdit(open);
          if (!open && selectedEvent) {
            setShowEventDetails(true);
          }
        }}
      >
        <DialogContent className="w-[calc(100vw-2rem)] max-w-[600px] max-h-[90vh] overflow-hidden p-3 sm:p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base">Post-Game Report</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto overflow-x-hidden max-h-[calc(90vh-80px)]">
            {selectedEvent && (
              <PostGameEditor
                eventId={selectedEvent.id}
                isOpen={showPostGameEdit}
                onClose={() => {
                  setShowPostGameEdit(false);
                  loadEvents();
                  setShowEventDetails(true);
                }}
              />
            )}
          </div>
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
