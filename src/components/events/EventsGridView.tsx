
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, Users, Trophy, Trash2 } from 'lucide-react';
import { DatabaseEvent } from '@/types/event';
import { format, isSameDay } from 'date-fns';

interface EventsGridViewProps {
  events: DatabaseEvent[];
  onEditEvent: (event: DatabaseEvent) => void;
  onTeamSelection: (event: DatabaseEvent) => void;
  onPostGameEdit: (event: DatabaseEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  onScoreEdit: (event: DatabaseEvent) => void;
}

export const EventsGridView: React.FC<EventsGridViewProps> = ({
  events,
  onEditEvent,
  onTeamSelection,
  onPostGameEdit,
  onDeleteEvent,
  onScoreEdit
}) => {
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
    
    // Check for team_1, team_2, etc.
    let teamNumber = 1;
    while (scoresData[`team_${teamNumber}`] !== undefined) {
      const ourScore = scoresData[`team_${teamNumber}`];
      const opponentScore = scoresData[`opponent_${teamNumber}`];
      const outcome = scoresData[`outcome_${teamNumber}`];
      const teamName = scoresData[`team_${teamNumber}_name`] || `Team ${teamNumber}`;
      
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
        teamName: 'Team 1',
        ourScore,
        opponentScore,
        outcome: ourScore > opponentScore ? 'win' : ourScore < opponentScore ? 'loss' : 'draw',
        outcomeIcon
      });
    }
    
    return scores;
  };

  // Sort events by date
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {sortedEvents.map((event) => {
        const completed = isEventCompleted(event);
        const matchType = isMatchType(event.event_type);
        const teamScores = getTeamScores(event);
        
        return (
          <Card key={event.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-2">
                <Badge 
                  className={`text-xs ${matchType ? 'bg-red-500' : 'bg-blue-500'}`}
                  variant="default"
                >
                  {event.event_type}
                </Badge>
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
              <CardTitle className="text-base line-clamp-2">{event.title}</CardTitle>
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
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    📍 {event.location}
                  </p>
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
                
                {event.opponent && matchType && (
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    vs {event.opponent}
                  </p>
                )}
                
                {event.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {event.description}
                  </p>
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
