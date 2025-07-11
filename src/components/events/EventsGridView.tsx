
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, Edit, Trash2, Trophy, Target, Clock, CheckCircle, XCircle, Minus } from 'lucide-react';
import { DatabaseEvent } from '@/types/event';

interface EventsGridViewProps {
  events: DatabaseEvent[];
  onEditEvent: (event: DatabaseEvent) => void;
  onTeamSelection: (event: DatabaseEvent) => void;
  onPostGameEdit: (event: DatabaseEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  onScoreEdit: (event: DatabaseEvent) => void;
}

// Helper function to get match outcome
const getMatchOutcome = (event: DatabaseEvent) => {
  if (!event.scores || !Array.isArray(event.scores) || event.scores.length === 0) {
    return null;
  }

  // Find our team(s) and opponent scores
  const ourTeams = event.scores.filter((score: any) => score.isOurTeam);
  const opponentScores = event.scores.filter((score: any) => !score.isOurTeam);

  if (ourTeams.length === 0 || opponentScores.length === 0) {
    return null;
  }

  // Calculate total scores
  const ourTotalScore = ourTeams.reduce((sum: number, team: any) => sum + (parseInt(team.score) || 0), 0);
  const opponentTotalScore = opponentScores.reduce((sum: number, team: any) => sum + (parseInt(team.score) || 0), 0);

  if (ourTotalScore > opponentTotalScore) {
    return { result: 'win', icon: CheckCircle, color: 'text-green-600', label: 'Win' };
  } else if (ourTotalScore < opponentTotalScore) {
    return { result: 'loss', icon: XCircle, color: 'text-red-600', label: 'Loss' };
  } else {
    return { result: 'draw', icon: Minus, color: 'text-yellow-600', label: 'Draw' };
  }
};

export const EventsGridView: React.FC<EventsGridViewProps> = ({
  events,
  onEditEvent,
  onTeamSelection,
  onPostGameEdit,
  onDeleteEvent,
  onScoreEdit
}) => {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (time: string | null) => {
    if (!time) return '';
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'match':
      case 'fixture':
        return 'bg-blue-100 text-blue-800';
      case 'training':
        return 'bg-green-100 text-green-800';
      case 'tournament':
        return 'bg-purple-100 text-purple-800';
      case 'friendly':
        return 'bg-orange-100 text-orange-800';
      case 'festival':
        return 'bg-pink-100 text-pink-800';
      case 'social':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isMatchType = (type: string) => {
    return ['match', 'fixture', 'friendly', 'tournament'].includes(type);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {events.map((event) => {
        const outcome = isMatchType(event.event_type) ? getMatchOutcome(event) : null;
        
        return (
          <Card key={event.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="text-lg font-semibold">{event.title}</CardTitle>
                    {outcome && (
                      <div className="flex items-center gap-1" title={outcome.label}>
                        <outcome.icon className={`h-4 w-4 ${outcome.color}`} />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(event.date)}</span>
                    {event.start_time && (
                      <>
                        <Clock className="h-4 w-4 ml-2" />
                        <span>{formatTime(event.start_time)}</span>
                      </>
                    )}
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  )}
                  {event.opponent && (
                    <div className="text-sm text-muted-foreground mb-2">
                      vs {event.opponent}
                    </div>
                  )}
                </div>
                <Badge className={getEventTypeColor(event.event_type)}>
                  {event.event_type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2 mb-3">
                {event.game_format && (
                  <Badge variant="outline" className="text-xs">
                    {event.game_format}
                  </Badge>
                )}
                {event.is_home !== null && (
                  <Badge variant="outline" className="text-xs">
                    {event.is_home ? 'Home' : 'Away'}
                  </Badge>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEditEvent(event)}
                  className="flex items-center gap-1"
                >
                  <Edit className="h-3 w-3" />
                  Edit
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onTeamSelection(event)}
                  className="flex items-center gap-1"
                >
                  <Users className="h-3 w-3" />
                  Team
                </Button>
                
                {isMatchType(event.event_type) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPostGameEdit(event)}
                    className="flex items-center gap-1"
                  >
                    <Target className="h-3 w-3" />
                    Report
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDeleteEvent(event.id)}
                  className="flex items-center gap-1 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
