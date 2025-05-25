
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, Users, Trophy, Trash2, Settings } from 'lucide-react';
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

  const getMatchOutcomeIcon = (event: DatabaseEvent) => {
    if (!event.scores || !isMatchType(event.event_type)) return null;
    
    const { home, away } = event.scores;
    const ourScore = event.is_home ? home : away;
    const theirScore = event.is_home ? away : home;
    
    if (ourScore > theirScore) return '🏆'; // Win
    if (ourScore < theirScore) return '❌'; // Loss
    return '🤝'; // Draw
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
        const outcomeIcon = getMatchOutcomeIcon(event);
        
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
                {completed && matchType && outcomeIcon && (
                  <span className="text-lg">{outcomeIcon}</span>
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
                
                {event.scores && matchType && (
                  <p className="text-sm font-medium">
                    Score: {event.scores.home} - {event.scores.away}
                  </p>
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
                
                {matchType && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => onScoreEdit(event)}
                    title="Edit Score"
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                )}
                
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
