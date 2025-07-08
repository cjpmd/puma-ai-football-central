import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Edit, Users, Trophy, Trash2 } from 'lucide-react';
import { DatabaseEvent } from '@/types/event';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { WeatherService } from '@/services/weatherService';

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

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  useEffect(() => {
    loadEventWeather();
  }, [events]);

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
    
    // Check for team_1, team_2, etc. (performance category teams)
    let teamNumber = 1;
    while (scoresData[`team_${teamNumber}`] !== undefined) {
      const ourScore = scoresData[`team_${teamNumber}`];
      const opponentScore = scoresData[`opponent_${teamNumber}`];
      const outcome = scoresData[`outcome_${teamNumber}`];
      const teamName = scoresData[`team_${teamNumber}_name`] || `T${teamNumber}`;
      
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
    
    // Fallback to home/away scores if no team scores found
    if (scores.length === 0 && scoresData.home !== undefined && scoresData.away !== undefined) {
      const ourScore = event.is_home ? scoresData.home : scoresData.away;
      const opponentScore = event.is_home ? scoresData.away : scoresData.home;
      
      let outcomeIcon = '';
      if (ourScore > opponentScore) outcomeIcon = '🏆';
      else if (ourScore < opponentScore) outcomeIcon = '❌';
      else outcomeIcon = '🤝';
      
      scores.push({
        teamNumber: 1,
        teamName: 'T1',
        ourScore,
        opponentScore,
        outcome: ourScore > opponentScore ? 'win' : ourScore < opponentScore ? 'loss' : 'draw',
        outcomeIcon
      });
    }
    
    return scores;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
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
          const isToday = isSameDay(day, new Date());

          return (
            <Card 
              key={day.toISOString()} 
              className={`min-h-[120px] ${!isCurrentMonth ? 'opacity-50' : ''} ${isToday ? 'ring-2 ring-primary' : ''}`}
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
                      
                      return (
                        <div key={event.id} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Badge 
                              className={`text-xs ${matchType ? 'bg-red-500' : 'bg-blue-500'}`}
                              variant="default"
                            >
                              {event.event_type}
                            </Badge>
                            <div className="flex items-center gap-1">
                              {weather && (
                                <img 
                                  src={`https://openweathermap.org/img/wn/${weather.icon}.png`}
                                  alt={weather.description}
                                  className="w-4 h-4"
                                  title={`${Math.round(weather.temp)}°C`}
                                />
                              )}
                              {completed && matchType && teamScores.length > 0 && (
                                <div className="flex gap-1">
                                  {teamScores.map((score) => (
                                    <span key={score.teamNumber} className="text-sm">
                                      {score.outcomeIcon}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-xs font-medium truncate" title={event.title}>
                            {event.title}
                          </div>
                          
                          {event.start_time && (
                            <div className="text-xs text-muted-foreground">
                              {event.start_time}
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
