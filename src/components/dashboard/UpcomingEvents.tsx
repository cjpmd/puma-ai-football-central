
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Edit } from 'lucide-react';
import { format, isToday, isTomorrow, addDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { EnhancedKitAvatar } from '@/components/shared/EnhancedKitAvatar';

interface Event {
  id: string;
  title: string;
  date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  event_type: string;
  opponent?: string;
  team_id: string;
  is_home?: boolean;
  kit_selection?: 'home' | 'away' | 'training';
  scores?: any;
}

interface UpcomingEventsProps {
  onEditEvent?: (event: Event) => void;
}

export const UpcomingEvents: React.FC<UpcomingEventsProps> = ({ onEditEvent }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [performanceCategories, setPerformanceCategories] = useState<{[key: string]: string}>({});
  const { teams } = useAuth();

  useEffect(() => {
    loadUpcomingEvents();
  }, [teams]);

  const loadUpcomingEvents = async () => {
    try {
      if (!teams || teams.length === 0) return;

      const teamIds = teams.map(team => team.id);
      const today = new Date();
      const nextWeek = addDays(today, 7);

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .in('team_id', teamIds)
        .gte('date', today.toISOString().split('T')[0])
        .lte('date', nextWeek.toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Load performance categories for all teams
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('performance_categories')
        .select('*')
        .in('team_id', teamIds);

      if (categoriesError) throw categoriesError;
      
      const categoryMap: {[key: string]: string} = {};
      categoriesData?.forEach(cat => {
        categoryMap[cat.id] = cat.name;
      });
      setPerformanceCategories(categoryMap);

      setEvents((data || []) as Event[]);
    } catch (error: any) {
      console.error('Error loading upcoming events:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatEventDate = (dateStr: string) => {
    const eventDate = new Date(dateStr);
    
    if (isToday(eventDate)) {
      return 'Today';
    } else if (isTomorrow(eventDate)) {
      return 'Tomorrow';
    } else {
      return format(eventDate, 'EEE, MMM d');
    }
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '';
    try {
      return format(new Date(`2000-01-01T${timeStr}`), 'h:mm a');
    } catch (error) {
      return timeStr;
    }
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'fixture':
      case 'match':
        return 'bg-blue-500';
      case 'friendly':
        return 'bg-green-500';
      case 'training':
        return 'bg-purple-500';
      case 'tournament':
        return 'bg-orange-500';
      case 'festival':
        return 'bg-pink-500';
      default:
        return 'bg-gray-500';
    }
  };

  const isMatchType = (eventType: string) => {
    return ['match', 'fixture', 'friendly'].includes(eventType);
  };

  const getTeamScores = (event: Event) => {
    if (!event.scores) return [];
    
    const scores = [];
    const scoresData = event.scores as any;
    
    // Check for team_1, team_2, etc. (performance category teams)
    let teamNumber = 1;
    while (scoresData[`team_${teamNumber}`] !== undefined) {
      const ourScore = scoresData[`team_${teamNumber}`];
      const opponentScore = scoresData[`opponent_${teamNumber}`];
      const categoryId = scoresData[`team_${teamNumber}_category_id`];
      const teamName = performanceCategories[categoryId] || `Team ${teamNumber}`;
      
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
        teamName: 'Team',
        ourScore,
        opponentScore,
        outcome,
        outcomeIcon
      });
    }
    
    return scores;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Events</CardTitle>
        <CardDescription>Next 7 days</CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No upcoming events in the next 7 days</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => {
              const team = teams.find(t => t.id === event.team_id);
              const kitDesign = team?.kitDesigns?.[event.kit_selection as 'home' | 'away' | 'training'];
              const teamScores = getTeamScores(event);
              
              return (
                <div key={event.id} className="flex items-center justify-between p-3 rounded-lg border hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex flex-col items-center min-w-[60px]">
                      <span className="text-xs text-muted-foreground font-medium">
                        {formatEventDate(event.date)}
                      </span>
                      {event.start_time && (
                        <span className="text-sm font-semibold">
                          {formatTime(event.start_time)}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className={`text-white text-xs ${getEventTypeColor(event.event_type)}`}>
                        {event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1)}
                      </Badge>
                      
                      {kitDesign && (
                        <EnhancedKitAvatar design={kitDesign} size="sm" />
                      )}
                      
                      {isMatchType(event.event_type) && teamScores.length > 0 && (
                        <div className="flex gap-1">
                          {teamScores.map((score, index) => (
                            <span key={index} className="text-lg" title={`${score.teamName}: ${score.outcome}`}>
                              {score.outcomeIcon}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">
                        {isMatchType(event.event_type) && event.opponent 
                          ? `${team?.name} vs ${event.opponent}`
                          : event.title
                        }
                      </h4>
                      
                      {event.location && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                      
                      {teamScores.length > 0 && (
                        <div className="mt-1 space-y-1">
                          {teamScores.map((score) => (
                            <Badge key={score.teamNumber} variant="outline" className="text-xs mr-1">
                              {score.teamName}: {score.ourScore} - {score.opponentScore}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {onEditEvent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditEvent(event)}
                      className="ml-2"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
