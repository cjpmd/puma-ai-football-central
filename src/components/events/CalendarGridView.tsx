
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Edit, Users, Trophy, Trash2, Target, Clock, MapPin } from 'lucide-react';
import { DatabaseEvent } from '@/types/event';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, isPast } from 'date-fns';
import { isEventPast, formatTime } from '@/utils/eventUtils';
import { WeatherService } from '@/services/weatherService';
import { EnhancedKitAvatar } from '@/components/shared/EnhancedKitAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { TrainingPackView } from '../training/TrainingPackView';
import { userAvailabilityService, UserAvailabilityStatus } from '@/services/userAvailabilityService';
import { MultiRoleAvailabilityControls } from './MultiRoleAvailabilityControls';
import { multiRoleAvailabilityService } from '@/services/multiRoleAvailabilityService';
import { getUserContextForEvent, formatEventTimeDisplay, UserTeamContext } from '@/utils/teamTimingUtils';
import { useSmartView } from '@/contexts/SmartViewContext';
import { EventActionButtons } from './EventActionButtons';

interface CalendarGridViewProps {
  events: DatabaseEvent[];
  individualTrainingSessions?: any[];
  onEditEvent: (event: DatabaseEvent) => void;
  onTeamSelection: (event: DatabaseEvent) => void;
  onPostGameEdit: (event: DatabaseEvent) => void;
  onDeleteEvent: (eventId: string) => void;
}

interface WeatherData {
  temp: number;
  description: string;
  icon: string;
}

export const CalendarGridView: React.FC<CalendarGridViewProps> = ({
  events,
  individualTrainingSessions = [],
  onEditEvent,
  onTeamSelection,
  onPostGameEdit,
  onDeleteEvent
}) => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [eventWeather, setEventWeather] = useState<{ [eventId: string]: WeatherData }>({});
  const [performanceCategories, setPerformanceCategories] = useState<{[key: string]: string}>({});
  const [userAvailability, setUserAvailability] = useState<UserAvailabilityStatus[]>([]);
  const [eventTimeContexts, setEventTimeContexts] = useState<{[eventId: string]: UserTeamContext}>({});
  const [invitedEventIds, setInvitedEventIds] = useState<Set<string>>(new Set());
  const [selectedTrainingPack, setSelectedTrainingPack] = useState<DatabaseEvent | null>(null);
  const { teams, user, connectedPlayers } = useAuth();
  const { currentView } = useSmartView();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  useEffect(() => {
    loadEventWeather();
    loadPerformanceCategories();
    loadEventTimeContexts();
    if (user?.id) {
      loadInvitedEvents();
    }
  }, [events, teams, user?.id]);

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

      console.log('=== CALENDAR GRID VIEW DEBUG ===');
      console.log('Loading availability for user:', user.id);
      console.log('User object:', user);

      const eventIds = events.map(event => event.id);
      console.log('Event IDs to check:', eventIds.map(id => `${id.slice(-6)} (${id})`));
      
      const availability = await userAvailabilityService.getUserAvailabilityForEvents(user.id, eventIds);
      console.log('Received availability in calendar:', availability);
      
      setUserAvailability(availability);
      console.log('=== END CALENDAR GRID VIEW DEBUG ===');
    } catch (error) {
      console.error('Error in loadUserAvailability:', error);
    }
  };

  const getAvailabilityStatus = (eventId: string): 'pending' | 'available' | 'unavailable' | null => {
    const availability = userAvailability.find(a => a.eventId === eventId);
    const status = availability?.status || null;
    console.log(`Availability status for event ${eventId.slice(-6)}:`, status, 'from source:', availability?.source);
    return status;
  };

  const getEventBorderClass = (eventId: string): string => {
    const status = getAvailabilityStatus(eventId);
    console.log(`Border class for event ${eventId.slice(-6)}:`, status);
    
    switch (status) {
      case 'available':
        return 'border-l-green-500 border-l-2';
      case 'unavailable':
        return 'border-l-red-500 border-l-2';
      case 'pending':
        return 'border-l-amber-500 border-l-2';
      default:
        return 'border-l-blue-500 border-l-2';
    }
  };

  const loadEventWeather = async () => {
    const weatherData: { [eventId: string]: WeatherData } = {};
    
    for (const event of events) {
      if (event.latitude && event.longitude) {
        try {
          const weather = await WeatherService.getWeatherForecast(
            event.latitude,
            event.longitude,
            event.date
          );
          
          if (weather) {
            weatherData[event.id] = {
              temp: weather.temp,
              description: weather.description,
              icon: weather.icon
            };
          }
        } catch (error) {
          console.log(`Failed to load weather for event ${event.id}:`, error);
        }
      }
    }
    
    setEventWeather(weatherData);
  };

  const loadPerformanceCategories = async () => {
    if (!teams || teams.length === 0) return;

    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('performance_categories')
        .select('*')
        .eq('team_id', teams[0].id);

      if (categoriesError) throw categoriesError;
      
      const categoryMap: {[key: string]: string} = {};
      categoriesData?.forEach(cat => {
        categoryMap[cat.id] = cat.name;
      });
      setPerformanceCategories(categoryMap);
    } catch (error) {
      console.log('Failed to load performance categories:', error);
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

  const getEventsForDay = (day: Date) => {
    const teamEvents = events.filter(event => isSameDay(new Date(event.date), day));
    const individualSessions = individualTrainingSessions.filter(session => 
      isSameDay(new Date(session.date), day)
    );
    return { teamEvents, individualSessions };
  };

  const isEventCompleted = (event: DatabaseEvent) => {
    return isEventPast(event);
  };

  const isMatchType = (eventType: string) => {
    return ['match', 'fixture', 'friendly'].includes(eventType);
  };

  const getTeamScores = (event: DatabaseEvent) => {
    if (!event.scores || !isMatchType(event.event_type)) return [];
    
    const scores = [];
    const scoresData = event.scores as any;
    
    console.log('Desktop calendar - getTeamScores for event:', event.id, 'scores:', scoresData);
    
    // Check for team_1, team_2, etc. (performance category teams)
    let teamNumber = 1;
    while (scoresData[`team_${teamNumber}`] !== undefined) {
      const ourScore = scoresData[`team_${teamNumber}`];
      const opponentScore = scoresData[`opponent_${teamNumber}`];
      const categoryId = scoresData[`team_${teamNumber}_category_id`];
      const teamName = performanceCategories[categoryId] || `T${teamNumber}`;
      
      let outcome = 'draw';
      let outcomeIcon = '🤝';
      
      if (ourScore > opponentScore) {
        outcome = 'win';
        outcomeIcon = '🏆';
      } else if (ourScore < opponentScore) {
        outcome = 'loss';
        outcomeIcon = '❌';
      }
      
      console.log(`Team ${teamNumber}: ${ourScore}-${opponentScore}, outcome: ${outcome}, icon: ${outcomeIcon}`);
      
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
      
      console.log(`Home/Away: ${ourScore}-${opponentScore}, outcome: ${outcome}, icon: ${outcomeIcon}`);
      
      scores.push({
        teamNumber: 1,
        teamName: 'T1',
        ourScore,
        opponentScore,
        outcome,
        outcomeIcon
      });
    }
    
    console.log('Final scores array:', scores);
    return scores;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
  };

  const shouldShowTitle = (event: DatabaseEvent) => {
    return !isMatchType(event.event_type) || !event.opponent;
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

  const handleAvailabilityChange = (eventId: string, role: string, status: 'available' | 'unavailable') => {
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

  return (
    <div className="space-y-6">
      {/* Enhanced Month Navigation */}
      <Card className="p-4 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigateMonth('prev')} size="lg">
            <ChevronLeft className="h-5 w-5" />
            <span className="ml-2 hidden sm:inline">
              {format(subMonths(currentDate, 1), 'MMM')}
            </span>
          </Button>
          
          <div className="text-center">
            <h2 className="text-3xl font-bold text-primary">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {events.filter(e => {
                const eventDate = new Date(e.date);
                return eventDate.getMonth() === currentDate.getMonth() && 
                       eventDate.getFullYear() === currentDate.getFullYear();
              }).length} events this month
            </p>
          </div>
          
          <Button variant="outline" onClick={() => navigateMonth('next')} size="lg">
            <span className="mr-2 hidden sm:inline">
              {format(addMonths(currentDate, 1), 'MMM')}
            </span>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </Card>

      {/* Enhanced Calendar Grid */}
      <div className="grid grid-cols-7 gap-3">
        {/* Day Headers */}
        {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => (
          <div key={day} className="p-3 text-center font-semibold text-primary bg-primary/5 rounded-lg">
            <div className="text-sm">{day}</div>
            <div className="text-xs text-muted-foreground hidden sm:block">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][index]}
            </div>
          </div>
        ))}

        {/* Calendar Days */}
        {calendarDays.map(day => {
          const { teamEvents, individualSessions } = getEventsForDay(day);
          const allEvents = [...teamEvents, ...individualSessions];
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isEventToday = isSameDay(day, new Date());

          return (
            <Card 
              key={day.toISOString()} 
              className={`min-h-[140px] ${!isCurrentMonth ? 'opacity-50' : ''} ${isEventToday ? 'ring-2 ring-primary bg-primary/5' : ''} hover:shadow-md transition-shadow`}
            >
              <CardContent className="p-3 h-full">
                <div className="flex flex-col h-full">
                  <div className={`text-lg font-bold mb-2 ${isEventToday ? 'text-primary' : ''}`}>
                    {format(day, 'd')}
                  </div>
                  
                  <div className="flex-1 space-y-1 overflow-y-auto">
                    {/* Team Events */}
                    {teamEvents.map(event => {
                      const completed = isEventCompleted(event);
                      const matchType = isMatchType(event.event_type);
                      const teamScores = getTeamScores(event);
                      const weather = eventWeather[event.id];
                      const team = teams?.find(t => t.id === event.team_id);
                      const kitDesign = team?.kitDesigns?.[event.kit_selection as 'home' | 'away' | 'training'];
                      const borderClass = getEventBorderClass(event.id);
                      const availabilityStatus = getAvailabilityStatus(event.id);
                      const showAvailabilityControls = shouldShowAvailabilityControls(event);
                      
                      return (
                        <div key={event.id} className={`space-y-1 p-1 rounded ${borderClass}`}>
                          {/* Top line: Event type, Kit, and Win/Loss/Draw icons */}
                          <div className="flex items-center justify-between">
                            <Badge 
                              className={`text-xs ${matchType ? 'bg-red-500' : 'bg-blue-500'}`}
                              variant="default"
                            >
                              {event.event_type}
                            </Badge>
                            <div className="flex items-center gap-1">
                              {kitDesign && (
                                <EnhancedKitAvatar design={kitDesign} size="xs" />
                              )}
                              {/* Show outcome icons for matches with scores */}
                              {matchType && event.scores && (
                                <div className="flex gap-1">
                                  {(() => {
                                    const scores = event.scores as any;
                                    const icons = [];
                                    
                                    // Check for team_1, team_2, etc. scores
                                    let teamNumber = 1;
                                    while (scores[`team_${teamNumber}`] !== undefined) {
                                      const ourScore = scores[`team_${teamNumber}`];
                                      const opponentScore = scores[`opponent_${teamNumber}`];
                                      
                                      let outcomeIcon = '🤝'; // draw
                                      if (ourScore > opponentScore) {
                                        outcomeIcon = '🏆'; // win
                                      } else if (ourScore < opponentScore) {
                                        outcomeIcon = '❌'; // loss
                                      }
                                      
                                      icons.push(
                                        <span key={teamNumber} className="text-sm">
                                          {outcomeIcon}
                                        </span>
                                      );
                                      teamNumber++;
                                    }
                                    
                                    // Fallback to home/away scores if no team scores
                                    if (icons.length === 0 && scores.home !== undefined && scores.away !== undefined) {
                                      const ourScore = event.is_home ? scores.home : scores.away;
                                      const opponentScore = event.is_home ? scores.away : scores.home;
                                      
                                      let outcomeIcon = '🤝'; // draw
                                      if (ourScore > opponentScore) {
                                        outcomeIcon = '🏆'; // win
                                      } else if (ourScore < opponentScore) {
                                        outcomeIcon = '❌'; // loss
                                      }
                                      
                                      icons.push(
                                        <span key="main" className="text-sm">
                                          {outcomeIcon}
                                        </span>
                                      );
                                    }
                                    
                                    return icons;
                                  })()}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Club badge vs opponent OR title */}
                          {shouldShowTitle(event) ? (
                            <div className="text-xs font-medium truncate" title={event.title}>
                              {event.title}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-xs">
                              {team?.logoUrl && (
                                <img 
                                  src={team.logoUrl} 
                                  alt={team.name}
                                  className="w-3 h-3 rounded-full"
                                />
                              )}
                              <span className="text-muted-foreground">vs</span>
                              <span className="font-medium truncate">{event.opponent}</span>
                            </div>
                           )}
                           
                           {/* Time Display - now shows team-specific times */}
                           {eventTimeContexts[event.id] && (
                             <div className="text-xs text-muted-foreground">
                               {formatEventTimeDisplay(eventTimeContexts[event.id])}
                             </div>
                           )}

                           {teamScores.length > 0 && matchType && (
                             <div className="space-y-1">
                               {teamScores.map((score) => (
                                 <div key={score.teamNumber} className="flex items-center gap-1 text-xs text-muted-foreground">
                                   <span>{score.teamName}: {score.ourScore} - {score.opponentScore}</span>
                                   <span className="text-sm">{score.outcomeIcon}</span>
                                 </div>
                               ))}
                             </div>
                           )}

                          {/* Availability Controls */}
                          {showAvailabilityControls && (
                            <div className="mt-1">
                              <MultiRoleAvailabilityControls
                                eventId={event.id}
                                size="sm"
                              />
                            </div>
                          )}
                          
                          {/* Location and weather */}
                          <div className="flex items-center justify-end">
                            {weather && (
                              <img 
                                src={`https://openweathermap.org/img/wn/${weather.icon}.png`}
                                alt={weather.description}
                                className="w-4 h-4"
                                title={`${Math.round(weather.temp)}°C`}
                              />
                            )}
                          </div>
                          
                          <EventActionButtons
                            event={event}
                            completed={completed}
                            matchType={matchType}
                            currentView={currentView}
                            onEditEvent={onEditEvent}
                            onTeamSelection={onTeamSelection}
                            onPostGameEdit={onPostGameEdit}
                            onDeleteEvent={onDeleteEvent}
                            onTrainingPack={setSelectedTrainingPack}
                            onGameDay={(event) => navigate(`/game-day/${event.id}`)}
                          />
                        </div>
                      );
                    })}

                    {/* Individual Training Sessions */}
                    {individualSessions.map(session => {
                      // Get connected player from auth context
                      const connectedPlayer = connectedPlayers?.find(p => p.id === session.player_id);
                      
                      return (
                        <div key={session.id} className="space-y-1 p-1 rounded border-l-purple-500 border-l-2 bg-purple-50">
                          {/* Individual Training Header */}
                          <div className="flex items-center justify-between">
                            <Badge className="text-xs bg-purple-500" variant="default">
                              Individual
                            </Badge>
                            <div className="flex items-center gap-1">
                              <Target className="w-3 h-3 text-purple-600" />
                            </div>
                          </div>
                          
                          {/* Session Title */}
                          <div className="text-xs font-medium truncate text-purple-800" title={session.title}>
                            {session.title}
                          </div>
                          
                          {/* Player Name */}
                          {connectedPlayer && (
                            <div className="text-xs text-purple-600 truncate">
                              {connectedPlayer.name}
                            </div>
                          )}
                          
                          {/* Time and Duration */}
                          {session.start_time && (
                            <div className="text-xs text-purple-600">
                              {session.start_time}
                            </div>
                          )}
                          
                          {/* Session Details */}
                          <div className="flex items-center gap-1 text-xs">
                            <Clock className="w-2 h-2 text-purple-500" />
                            <span className="text-purple-600">{session.duration_minutes}min</span>
                            {session.location && (
                              <>
                                <MapPin className="w-2 h-2 text-purple-500 ml-1" />
                                <span className="text-purple-600 truncate">{session.location}</span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedTrainingPack && (
        <TrainingPackView
          event={selectedTrainingPack}
          onClose={() => setSelectedTrainingPack(null)}
        />
      )}
    </div>
  );
};
