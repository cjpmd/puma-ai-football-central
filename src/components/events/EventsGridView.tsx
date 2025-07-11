import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, Users, Trophy, Trash2 } from 'lucide-react';
import { DatabaseEvent } from '@/types/event';
import { format, isSameDay, isToday, isPast } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedKitAvatar } from '@/components/shared/EnhancedKitAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { WeatherService } from '@/services/weatherService';
import { QuickAvailabilityControls } from './QuickAvailabilityControls';

interface EventsGridViewProps {
  events: DatabaseEvent[];
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
  onEditEvent,
  onTeamSelection,
  onPostGameEdit,
  onDeleteEvent,
  onScoreEdit
}) => {
  const [performanceCategoryNames, setPerformanceCategoryNames] = useState<{ [eventId: string]: { [teamNumber: string]: string } }>({});
  const [eventWeather, setEventWeather] = useState<{ [eventId: string]: WeatherData }>({});
  const [userAvailability, setUserAvailability] = useState<UserAvailability[]>([]);
  const { teams } = useAuth();

  useEffect(() => {
    loadPerformanceCategoryNames();
    loadEventWeather();
    loadUserAvailability();
  }, [events]);

  const loadUserAvailability = async () => {
    try {
      const { data: availabilityData, error } = await supabase
        .from('event_availability')
        .select('event_id, status')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (error) {
        console.error('Error loading user availability:', error);
        return;
      }

      const availability = (availabilityData || []).map(item => ({
        eventId: item.event_id,
        status: item.status as 'pending' | 'available' | 'unavailable'
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
    const eventCategories = performanceCategoryNames[event.id] || {};
    
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
      
      const teamName = eventCategories['1'] || 'Team 1';
      
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
    // Show availability controls for future events only
    const eventDate = new Date(event.date);
    return eventDate >= new Date() || isToday(eventDate);
  };

  const handleAvailabilityChange = (eventId: string, status: 'available' | 'unavailable') => {
    // Update local state to reflect the change immediately
    setUserAvailability(prev => {
      const existing = prev.find(a => a.eventId === eventId);
      if (existing) {
        return prev.map(a => a.eventId === eventId ? { ...a, status } : a);
      } else {
        return [...prev, { eventId, status, source: 'manual' }];
      }
    });
  };

  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {sortedEvents.map((event) => {
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
                
                {event.start_time && (
                  <p className="text-sm text-muted-foreground">
                    {event.start_time}
                    {event.end_time && ` - ${event.end_time}`}
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
  );
};
