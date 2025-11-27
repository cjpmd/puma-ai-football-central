import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, Users, Trophy, Trash2, Target, Clock } from 'lucide-react';
import { DatabaseEvent } from '@/types/event';
import { format, isSameDay, isToday, isPast } from 'date-fns';
import { isEventPast, formatTime } from '@/utils/eventUtils';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedKitAvatar } from '@/components/shared/EnhancedKitAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { WeatherService } from '@/services/weatherService';
import { QuickAvailabilityControls } from './QuickAvailabilityControls';
import { getUserContextForEvent, formatEventTimeDisplay, UserTeamContext } from '@/utils/teamTimingUtils';
import { useSmartView } from '@/contexts/SmartViewContext';
import { EventActionButtons } from './EventActionButtons';
import { multiRoleAvailabilityService } from '@/services/multiRoleAvailabilityService';
import { TrainingPackView } from '../training/TrainingPackView';

interface EventsGridViewProps {
  events: DatabaseEvent[];
  individualTrainingSessions?: any[];
  onEditEvent: (event: DatabaseEvent) => void;
  onTeamSelection: (event: DatabaseEvent) => void;
  onPostGameEdit: (event: DatabaseEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  onScoreEdit: (event: DatabaseEvent) => void;
}

interface WeatherData {
  temp: number;
  description: string;
  icon: string;
}

interface UserAvailability {
  eventId: string;
  status: 'pending' | 'available' | 'unavailable';
}

export const EventsGridView: React.FC<EventsGridViewProps> = ({
  events,
  individualTrainingSessions = [],
  onEditEvent,
  onTeamSelection,
  onPostGameEdit,
  onDeleteEvent,
  onScoreEdit
}) => {
  const navigate = useNavigate();
  const [performanceCategoryNames, setPerformanceCategoryNames] = useState<{ [eventId: string]: { [teamNumber: string]: string } }>({});
  const [eventWeather, setEventWeather] = useState<{ [eventId: string]: WeatherData }>({});
  const [userAvailability, setUserAvailability] = useState<UserAvailability[]>([]);
  const [eventTimeContexts, setEventTimeContexts] = useState<{[eventId: string]: UserTeamContext}>({});
  const [selectedTrainingPack, setSelectedTrainingPack] = useState<DatabaseEvent | null>(null);
  const { teams, user } = useAuth();
  const [invitedEventIds, setInvitedEventIds] = useState<Set<string>>(new Set());
  const { currentView } = useSmartView();

  useEffect(() => {
    loadPerformanceCategoryNames();
    loadEventWeather();
    loadUserAvailability();
    loadEventTimeContexts();

    (async () => {
      if (!user?.id) return;
      const invitedIds = new Set<string>();
      for (const e of events) {
        try {
          const invited = await multiRoleAvailabilityService.isUserInvitedToEvent(e.id, user.id);
          if (invited) invitedIds.add(e.id);
        } catch (err) {
          console.error('Error determining invitations for event', e.id, err);
        }
      }
      setInvitedEventIds(invitedIds);
    })();
  }, [events, user?.id]);

  const loadUserAvailability = async () => {
    try {
      const { data: availabilityData, error } = await supabase
        .from('event_availability')
        .select('event_id, status, role')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (error) {
        console.error('Error loading user availability:', error);
        return;
      }

      // Aggregate per event so a concrete choice (available/unavailable) wins over pending
      const byEvent = new Map<string, 'pending' | 'available' | 'unavailable'>();
      (availabilityData || []).forEach((row: any) => {
        const current = byEvent.get(row.event_id);
        const nextStatus = row.status as 'pending' | 'available' | 'unavailable';
        if (nextStatus === 'available') {
          byEvent.set(row.event_id, 'available');
        } else if (nextStatus === 'unavailable') {
          if (current !== 'available') byEvent.set(row.event_id, 'unavailable');
        } else if (!current) {
          byEvent.set(row.event_id, 'pending');
        }
      });

      const availability: UserAvailability[] = Array.from(byEvent.entries()).map(([eventId, status]) => ({
        eventId,
        status
      }));

      setUserAvailability(availability);
    } catch (error) {
      console.error('Error in loadUserAvailability:', error);
    }
  };
  const getAvailabilityStatus = (eventId: string): 'pending' | 'available' | 'unavailable' | null => {
    const availability = userAvailability.find(a => a.eventId === eventId);
    return availability?.status || null;
  };

  const getEventOutlineClass = (eventId: string): string => {
    const status = getAvailabilityStatus(eventId);
    switch (status) {
      case 'available':
        return 'border-l-green-500 border-l-4';
      case 'unavailable':
        return 'border-l-red-500 border-l-4';
      case 'pending':
        return 'border-l-amber-500 border-l-4';
      default:
        return '';
    }
  };

  const loadPerformanceCategoryNames = async () => {
    try {
      const eventIds = events.map(event => event.id);
      if (eventIds.length === 0) return;

      const { data: selections, error } = await supabase
        .from('event_selections')
        .select(`
          event_id,
          team_number,
          performance_category_id,
          performance_categories!inner(name)
        `)
        .in('event_id', eventIds);

      if (error) {
        console.error('Error loading performance categories:', error);
        return;
      }

      const categoryMap: { [eventId: string]: { [teamNumber: string]: string } } = {};
      
      selections?.forEach(selection => {
        if (!categoryMap[selection.event_id]) {
          categoryMap[selection.event_id] = {};
        }
        const categoryName = (selection.performance_categories as any)?.name;
        if (categoryName) {
          categoryMap[selection.event_id][selection.team_number.toString()] = categoryName;
        }
      });

      setPerformanceCategoryNames(categoryMap);
    } catch (error) {
      console.error('Error in loadPerformanceCategoryNames:', error);
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
    const eventCategories = performanceCategoryNames[event.id] || {};
    
    // Find team name from context for single-team events
    const eventTeam = teams?.find(t => t.id === event.team_id);
    const defaultTeamName = eventTeam?.name || 'Team 1';
    
    let teamNumber = 1;
    while (scoresData[`team_${teamNumber}`] !== undefined) {
      const ourScore = scoresData[`team_${teamNumber}`];
      const opponentScore = scoresData[`opponent_${teamNumber}`];
      const outcome = scoresData[`outcome_${teamNumber}`];
      const teamName = eventCategories[teamNumber.toString()] || scoresData[`team_${teamNumber}_name`] || `Team ${teamNumber}`;
      
      let outcomeIcon = '';
      if (outcome === 'win') outcomeIcon = '🏆';
      else if (outcome === 'loss') outcomeIcon = '❌';
      else if (outcome === 'draw') outcomeIcon = '🤝';
      
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
    
    if (scores.length === 0 && scoresData.home !== undefined && scoresData.away !== undefined) {
      const ourScore = event.is_home ? scoresData.home : scoresData.away;
      const opponentScore = event.is_home ? scoresData.away : scoresData.home;
      
      let outcomeIcon = '';
      if (ourScore > opponentScore) outcomeIcon = '🏆';
      else if (ourScore < opponentScore) outcomeIcon = '❌';
      else outcomeIcon = '🤝';
      
      const teamName = eventCategories['1'] || defaultTeamName;
      
      scores.push({
        teamNumber: 1,
        teamName,
        ourScore,
        opponentScore,
        outcome: ourScore > opponentScore ? 'win' : ourScore < opponentScore ? 'loss' : 'draw',
        outcomeIcon
      });
    }
    
    return scores;
  };

  const shouldShowTitle = (event: DatabaseEvent) => {
    return !isMatchType(event.event_type) || !event.opponent;
  };

  const shouldShowAvailabilityControls = (event: DatabaseEvent) => {
    const eventDate = new Date(event.date);
    const isFuture = eventDate >= new Date() || isToday(eventDate);
    if (!isFuture) return false;
    const isInvited = invitedEventIds.has(event.id);
    return isInvited;
  };

  const handleAvailabilityChange = (eventId: string, status: 'available' | 'unavailable') => {
    // Update local state to reflect the change immediately
    setUserAvailability(prev => {
      const existing = prev.find(a => a.eventId === eventId);
      if (existing) {
        return prev.map(a => a.eventId === eventId ? { ...a, status } : a);
      } else {
        return [...prev, { eventId, status }];
      }
    });
  };

  // Organize events by time
  const now = new Date();
  const upcomingEvents = events.filter(event => new Date(event.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const pastEvents = events.filter(event => new Date(event.date) < now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const nextEvent = upcomingEvents[0];

  return (
    <div className="space-y-8">
      {/* Next Event Spotlight */}
      {nextEvent && (
        <div className="mb-8">
          <h3 className="text-2xl font-bold mb-4 text-primary flex items-center gap-2">
            <Clock className="h-6 w-6" />
            Next Event
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {(() => {
              const event = nextEvent;
              const completed = isEventCompleted(event);
              const matchType = isMatchType(event.event_type);
              const teamScores = getTeamScores(event);
              const weather = eventWeather[event.id];
              const team = teams.find(t => t.id === event.team_id);
              const kitDesign = team?.kitDesigns?.[event.kit_selection as 'home' | 'away' | 'training'];
              const outlineClass = getEventOutlineClass(event.id);
              const availabilityStatus = getAvailabilityStatus(event.id);
               const showAvailabilityControls = shouldShowAvailabilityControls(event);
               
               return (
                <Card className={`${outlineClass} ring-2 ring-primary shadow-lg bg-primary/5 transform hover:scale-105 transition-transform`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex gap-2">
                        <Badge className="bg-primary text-primary-foreground">
                          Next Event
                        </Badge>
                        <Badge 
                          className={`text-xs ${matchType ? 'bg-red-500' : 'bg-blue-500'}`}
                          variant="default"
                        >
                          {event.event_type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {kitDesign && (
                          <EnhancedKitAvatar design={kitDesign} size="md" />
                        )}
                      </div>
                    </div>
                    
                    {shouldShowTitle(event) ? (
                      <CardTitle className="text-xl line-clamp-2">{event.title}</CardTitle>
                    ) : (
                      <div className="flex items-center gap-3">
                        {team?.logoUrl && (
                          <img 
                            src={team.logoUrl} 
                            alt={team.name}
                            className="w-8 h-8 rounded-full"
                          />
                        )}
                        <span className="text-lg text-muted-foreground">vs</span>
                        <span className="text-xl font-bold">{event.opponent}</span>
                      </div>
                    )}
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <p className="text-lg font-medium text-primary">
                          {format(new Date(event.date), 'EEEE, MMM dd, yyyy')}
                        </p>
                        
                        {eventTimeContexts[event.id] && (
                          <p className="text-lg font-medium text-primary">
                            {formatEventTimeDisplay(eventTimeContexts[event.id])}
                          </p>
                        )}
                      </div>
                      
                      {event.location && (
                        <div className="flex items-center justify-between">
                          <p className="text-base text-muted-foreground">
                            📍 {event.location}
                          </p>
                          {weather && (
                            <div className="flex items-center gap-2">
                              <img 
                                src={`https://openweathermap.org/img/wn/${weather.icon}.png`}
                                alt={weather.description}
                                className="w-8 h-8"
                                title={`${Math.round(weather.temp)}°C - ${weather.description}`}
                              />
                              <span className="text-base font-medium">
                                {Math.round(weather.temp)}°C
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {event.description && (
                        <p className="text-base text-muted-foreground">
                          {event.description}
                        </p>
                      )}

                      {showAvailabilityControls && (
                        <div className="pt-3 border-t">
                          <QuickAvailabilityControls
                            eventId={event.id}
                            currentStatus={availabilityStatus}
                            size="md"
                            onStatusChange={(status) => handleAvailabilityChange(event.id, status)}
                          />
                        </div>
                      )}
                      
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
                        size="md"
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      {upcomingEvents.length > 1 && (
        <div>
          <h3 className="text-xl font-semibold mb-4 text-primary">
            Other Upcoming Events
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {upcomingEvents.slice(1).map((event) => {
        const completed = isEventCompleted(event);
        const matchType = isMatchType(event.event_type);
        const teamScores = getTeamScores(event);
        const weather = eventWeather[event.id];
        const team = teams.find(t => t.id === event.team_id);
        const kitDesign = team?.kitDesigns?.[event.kit_selection as 'home' | 'away' | 'training'];
        const outlineClass = getEventOutlineClass(event.id);
        const availabilityStatus = getAvailabilityStatus(event.id);
        const showAvailabilityControls = shouldShowAvailabilityControls(event);
        
        return (
          <Card key={event.id} className={`flex flex-col ${outlineClass}`}>
            <CardHeader className="pb-3">
              {/* Top line: Event type and Kit */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex gap-2">
                  <Badge 
                    className={`text-xs ${matchType ? 'bg-red-500' : 'bg-blue-500'}`}
                    variant="default"
                  >
                    {event.event_type}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {kitDesign && (
                    <EnhancedKitAvatar design={kitDesign} size="sm" />
                  )}
                  {completed && matchType && teamScores.length > 0 && (
                    <div className="flex gap-1">
                      {teamScores.map((score) => (
                        <span key={score.teamNumber} className="text-lg">
                          {score.outcomeIcon}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Club badge vs opponent OR title */}
              {shouldShowTitle(event) ? (
                <CardTitle className="text-base line-clamp-2">{event.title}</CardTitle>
              ) : (
                <div className="flex items-center gap-2">
                  {team?.logoUrl && (
                    <img 
                      src={team.logoUrl} 
                      alt={team.name}
                      className="w-6 h-6 rounded-full"
                    />
                  )}
                  <span className="text-muted-foreground">vs</span>
                  <span className="font-semibold">{event.opponent}</span>
                </div>
              )}
            </CardHeader>
            
            <CardContent className="pt-0 flex-1 flex flex-col">
              <div className="flex-1 space-y-2">
                <p className="text-sm text-muted-foreground">
                  {format(new Date(event.date), 'MMM dd, yyyy')}
                </p>
                
                {/* Time Display - now shows team-specific times */}
                {eventTimeContexts[event.id] && (
                  <p className="text-sm text-muted-foreground">
                    {formatEventTimeDisplay(eventTimeContexts[event.id])}
                  </p>
                )}
                
                {event.location && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      📍 {event.location}
                    </p>
                    {weather && (
                      <div className="flex items-center gap-1">
                        <img 
                          src={`https://openweathermap.org/img/wn/${weather.icon}.png`}
                          alt={weather.description}
                          className="w-6 h-6"
                          title={`${Math.round(weather.temp)}°C - ${weather.description}`}
                        />
                        <span className="text-xs text-muted-foreground">
                          {Math.round(weather.temp)}°C
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
                {teamScores.length > 0 && matchType && (
                  <div className="space-y-1">
                    {teamScores.map((score) => (
                      <p key={score.teamNumber} className="text-sm font-medium">
                        {score.teamName}: {score.ourScore} - {score.opponentScore}
                        {score.outcomeIcon && ` ${score.outcomeIcon}`}
                      </p>
                    ))}
                  </div>
                )}
                
                {event.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {event.description}
                  </p>
                )}

                {/* Availability Controls - New Addition */}
                {showAvailabilityControls && (
                  <div className="pt-2 border-t">
                    <QuickAvailabilityControls
                      eventId={event.id}
                      currentStatus={availabilityStatus}
                      size="sm"
                      onStatusChange={(status) => handleAvailabilityChange(event.id, status)}
                    />
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => onEditEvent(event)}
                  title="Edit Event"
                >
                  <Edit className="h-3 w-3" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => onTeamSelection(event)}
                  title="Team Selection"
                >
                  <Users className="h-3 w-3" />
                </Button>
                
                {completed && matchType && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => onPostGameEdit(event)}
                    title="Post-Game Editor"
                  >
                    <Trophy className="h-3 w-3" />
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                  onClick={() => onDeleteEvent(event.id)}
                  title="Delete Event"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
            );
          })}
          </div>
        </div>
      )}

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4 text-muted-foreground">
            Past Events
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pastEvents.map((event) => {
              const completed = isEventCompleted(event);
              const matchType = isMatchType(event.event_type);
              const teamScores = getTeamScores(event);
              const weather = eventWeather[event.id];
              const team = teams.find(t => t.id === event.team_id);
              const kitDesign = team?.kitDesigns?.[event.kit_selection as 'home' | 'away' | 'training'];
              const outlineClass = getEventOutlineClass(event.id);
              
              return (
                <Card key={event.id} className={`flex flex-col ${outlineClass} opacity-75 hover:opacity-100 transition-opacity`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex gap-2">
                        <Badge 
                          className={`text-xs ${matchType ? 'bg-red-500' : 'bg-blue-500'}`}
                          variant="default"
                        >
                          {event.event_type}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Completed
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {kitDesign && (
                          <EnhancedKitAvatar design={kitDesign} size="sm" />
                        )}
                        {completed && matchType && teamScores.length > 0 && (
                          <div className="flex gap-1">
                            {teamScores.map((score) => (
                              <span key={score.teamNumber} className="text-lg">
                                {score.outcomeIcon}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {shouldShowTitle(event) ? (
                      <CardTitle className="text-base line-clamp-2">{event.title}</CardTitle>
                    ) : (
                      <div className="flex items-center gap-2">
                        {team?.logoUrl && (
                          <img 
                            src={team.logoUrl} 
                            alt={team.name}
                            className="w-6 h-6 rounded-full"
                          />
                        )}
                        <span className="text-muted-foreground">vs</span>
                        <span className="font-semibold">{event.opponent}</span>
                      </div>
                    )}
                  </CardHeader>
                  
                  <CardContent className="pt-0 flex-1 flex flex-col">
                    <div className="flex-1 space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(event.date), 'MMM dd, yyyy')}
                      </p>
                      
                      {teamScores.length > 0 && matchType && (
                        <div className="space-y-1">
                          {teamScores.map((score) => (
                            <p key={score.teamNumber} className="text-sm font-medium">
                              {score.teamName}: {score.ourScore} - {score.opponentScore}
                              {score.outcomeIcon && ` ${score.outcomeIcon}`}
                            </p>
                          ))}
                        </div>
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
                      size="sm"
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Individual Training Sessions */}
      {individualTrainingSessions.map((session) => (
        <Card key={session.id} className="flex flex-col border-l-purple-500 border-l-4 bg-purple-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between mb-2">
              <Badge className="text-xs bg-purple-500" variant="default">
                Individual Training
              </Badge>
              <Target className="w-4 h-4 text-purple-600" />
            </div>
            <CardTitle className="text-base line-clamp-2 text-purple-800">
              {session.title}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="pt-0 flex-1 flex flex-col">
            <div className="flex-1 space-y-2">
              <p className="text-sm text-purple-700">
                {format(new Date(session.date), 'MMM dd, yyyy')}
              </p>
              
              {session.start_time && (
                <p className="text-sm text-purple-600">
                  🕐 {session.start_time}
                </p>
              )}
              
              {session.location && (
                <p className="text-sm text-purple-600">
                  📍 {session.location}
                </p>
              )}
              
              <div className="flex items-center gap-2 text-sm text-purple-600">
                <Clock className="w-4 h-4" />
                <span>{session.duration_minutes} minutes</span>
                {session.intensity && (
                  <>
                    <Target className="w-4 h-4 ml-2" />
                    <span>Intensity {session.intensity}/5</span>
                  </>
                )}
              </div>
              
              {session.description && (
                <p className="text-sm text-purple-600 line-clamp-2">
                  {session.description}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {selectedTrainingPack && (
        <TrainingPackView
          event={selectedTrainingPack}
          onClose={() => setSelectedTrainingPack(null)}
        />
      )}
    </div>
  );
};
