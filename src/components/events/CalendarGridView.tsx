
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Edit, Users, Trophy, Trash2 } from 'lucide-react';
import { DatabaseEvent } from '@/types/event';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, isPast } from 'date-fns';
import { WeatherService } from '@/services/weatherService';
import { EnhancedKitAvatar } from '@/components/shared/EnhancedKitAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { userAvailabilityService, UserAvailabilityStatus } from '@/services/userAvailabilityService';
import { MultiRoleAvailabilityControls } from './MultiRoleAvailabilityControls';
import { getUserContextForEvent, formatEventTimeDisplay, UserTeamContext } from '@/utils/teamTimingUtils';

interface CalendarGridViewProps {
  events: DatabaseEvent[];
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
  onEditEvent,
  onTeamSelection,
  onPostGameEdit,
  onDeleteEvent
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [eventWeather, setEventWeather] = useState<{ [eventId: string]: WeatherData }>({});
  const [performanceCategories, setPerformanceCategories] = useState<{[key: string]: string}>({});
  const [userAvailability, setUserAvailability] = useState<UserAvailabilityStatus[]>([]);
  const [eventTimeContexts, setEventTimeContexts] = useState<{[eventId: string]: UserTeamContext}>({});
  const { teams, user } = useAuth();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  useEffect(() => {
    loadEventWeather();
    loadPerformanceCategories();
    loadEventTimeContexts();
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
    return events.filter(event => isSameDay(new Date(event.date), day));
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
    // Show availability controls for future events only
    const eventDate = new Date(event.date);
    return eventDate >= new Date() || isToday(eventDate);
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
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigateMonth('prev')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <Button variant="outline" onClick={() => navigateMonth('next')}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Day Headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center font-medium text-muted-foreground">
            {day}
          </div>
        ))}

        {/* Calendar Days */}
        {calendarDays.map(day => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isEventToday = isSameDay(day, new Date());

          return (
            <Card 
              key={day.toISOString()} 
              className={`min-h-[120px] ${!isCurrentMonth ? 'opacity-50' : ''} ${isEventToday ? 'ring-2 ring-primary' : ''}`}
            >
              <CardContent className="p-2 h-full">
                <div className="flex flex-col h-full">
                  <div className="text-sm font-medium mb-2">
                    {format(day, 'd')}
                  </div>
                  
                  <div className="flex-1 space-y-1 overflow-y-auto">
                    {dayEvents.map(event => {
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
                              {/* Show outcome icons for completed matches */}
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
                                <div key={score.teamNumber} className="text-xs text-muted-foreground">
                                  {score.teamName}: {score.ourScore} - {score.opponentScore}
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
                          
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => onEditEvent(event)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => onTeamSelection(event)}
                            >
                              <Users className="h-3 w-3" />
                            </Button>
                            
                            {completed && matchType && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => onPostGameEdit(event)}
                              >
                                <Trophy className="h-3 w-3" />
                              </Button>
                            )}
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                              onClick={() => onDeleteEvent(event.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
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
    </div>
  );
};
