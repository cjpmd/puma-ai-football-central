import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Event {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  eventType: string;
  opponent?: string;
  teamId: string;
  teamName: string;
  ageGroup: string;
  isHome?: boolean;
  scores?: any;
}

interface ClubCalendarEventsProps {
  clubId: string;
  clubName: string;
}

interface UserAvailability {
  eventId: string;
  status: 'pending' | 'available' | 'unavailable';
}

export const ClubCalendarEvents: React.FC<ClubCalendarEventsProps> = ({
  clubId,
  clubName
}) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedEventType, setSelectedEventType] = useState<string>('all');
  const [performanceCategories, setPerformanceCategories] = useState<{[key: string]: string}>({});
  const [userAvailability, setUserAvailability] = useState<UserAvailability[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (clubId) {
      loadClubEvents();
      loadUserAvailability();
    }
  }, [clubId]);

  useEffect(() => {
    filterEvents();
  }, [events, selectedTeam, selectedEventType]);

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
        return '';
    }
  };

  const loadClubEvents = async () => {
    try {
      setLoading(true);
      console.log('Loading events for club:', clubId);

      // Get all teams linked to this club
      const { data: clubTeams, error: clubTeamsError } = await supabase
        .from('club_teams')
        .select(`
          team_id,
          teams!inner(
            id,
            name,
            age_group
          )
        `)
        .eq('club_id', clubId);

      if (clubTeamsError) throw clubTeamsError;

      if (!clubTeams || clubTeams.length === 0) {
        setEvents([]);
        return;
      }

      const teamIds = clubTeams.map(ct => ct.team_id);

      // Get all events from linked teams
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .in('team_id', teamIds)
        .order('date', { ascending: true });

      if (eventsError) throw eventsError;

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

      // Transform data to include team information
      const eventsWithTeams = eventsData?.map(event => {
        const teamData = clubTeams.find(ct => ct.team_id === event.team_id)?.teams;
        return {
          id: event.id,
          title: event.title,
          date: event.date,
          startTime: event.start_time,
          endTime: event.end_time,
          location: event.location,
          eventType: event.event_type,
          opponent: event.opponent,
          teamId: event.team_id,
          teamName: teamData?.name || 'Unknown Team',
          ageGroup: teamData?.age_group || 'Unknown',
          isHome: event.is_home,
          scores: event.scores
        };
      }) || [];

      setEvents(eventsWithTeams);
    } catch (error: any) {
      console.error('Error loading club events:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load club events',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterEvents = () => {
    let filtered = events;

    if (selectedTeam !== 'all') {
      filtered = filtered.filter(event => event.teamId === selectedTeam);
    }

    if (selectedEventType !== 'all') {
      filtered = filtered.filter(event => event.eventType === selectedEventType);
    }

    setFilteredEvents(filtered);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'EEE, MMM d, yyyy');
    } catch (error) {
      return dateStr;
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
      const ourScore = event.isHome ? scoresData.home : scoresData.away;
      const opponentScore = event.isHome ? scoresData.away : scoresData.home;
      
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

  const isMatchType = (eventType: string) => {
    return ['match', 'fixture', 'friendly'].includes(eventType);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading club events...</p>
        </div>
      </div>
    );
  }

  const teams = Array.from(new Set(events.map(e => ({ id: e.teamId, name: e.teamName }))))
    .filter((team, index, arr) => arr.findIndex(t => t.id === team.id) === index);

  const eventTypes = Array.from(new Set(events.map(e => e.eventType)));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Calendar & Events - {clubName}</CardTitle>
          <CardDescription>Read-only view of all events from linked teams</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedEventType} onValueChange={setSelectedEventType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {eventTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Events Found</h3>
              <p className="text-muted-foreground">
                {events.length === 0 
                  ? "No teams are linked to this club yet."
                  : "No events match your current filters."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map((event) => {
                const teamScores = getTeamScores(event);
                const borderClass = getEventBorderClass(event.id);
                return (
                  <Card key={event.id} className={`hover:shadow-md transition-shadow ${borderClass}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className={`text-white ${getEventTypeColor(event.eventType)}`}>
                              {event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)}
                            </Badge>
                            <h4 className="font-semibold">{event.title}</h4>
                            {event.opponent && (
                              <span className="text-sm text-muted-foreground">
                                vs {event.opponent} {event.isHome ? '(H)' : '(A)'}
                              </span>
                            )}
                            {isMatchType(event.eventType) && teamScores.length > 0 && (
                              <div className="flex gap-1">
                                {teamScores.map((score, index) => (
                                  <span key={index} className="text-lg" title={`${score.teamName}: ${score.outcome}`}>
                                    {score.outcomeIcon}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span>{event.teamName} ({event.ageGroup})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDate(event.date)}</span>
                            </div>
                            {event.startTime && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>
                                  {formatTime(event.startTime)}
                                  {event.endTime && ` - ${formatTime(event.endTime)}`}
                                </span>
                              </div>
                            )}
                            {event.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span>{event.location}</span>
                              </div>
                            )}
                          </div>

                          {teamScores.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {teamScores.map((score) => (
                                <Badge key={score.teamNumber} variant="outline" className="mr-2">
                                  {score.teamName}: {score.ourScore} - {score.opponentScore}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
