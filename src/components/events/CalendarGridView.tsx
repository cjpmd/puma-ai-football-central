
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Edit, Users, Trophy, Trash2 } from 'lucide-react';
import { DatabaseEvent } from '@/types/event';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';

interface CalendarGridViewProps {
  events: DatabaseEvent[];
  onEditEvent: (event: DatabaseEvent) => void;
  onTeamSelection: (event: DatabaseEvent) => void;
  onPostGameEdit: (event: DatabaseEvent) => void;
  onDeleteEvent: (eventId: string) => void;
}

export const CalendarGridView: React.FC<CalendarGridViewProps> = ({
  events,
  onEditEvent,
  onTeamSelection,
  onPostGameEdit,
  onDeleteEvent
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

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

  const getMatchOutcomeIcon = (event: DatabaseEvent) => {
    if (!event.scores || !isMatchType(event.event_type)) return null;
    
    const { home, away } = event.scores;
    const ourScore = event.is_home ? home : away;
    const theirScore = event.is_home ? away : home;
    
    if (ourScore > theirScore) return '🏆'; // Win
    if (ourScore < theirScore) return '❌'; // Loss
    return '🤝'; // Draw
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
                      const outcomeIcon = getMatchOutcomeIcon(event);
                      
                      return (
                        <div key={event.id} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Badge 
                              className={`text-xs ${matchType ? 'bg-red-500' : 'bg-blue-500'}`}
                              variant="default"
                            >
                              {event.event_type}
                            </Badge>
                            {completed && matchType && outcomeIcon && (
                              <span className="text-sm">{outcomeIcon}</span>
                            )}
                          </div>
                          
                          <div className="text-xs font-medium truncate" title={event.title}>
                            {event.title}
                          </div>
                          
                          {event.start_time && (
                            <div className="text-xs text-muted-foreground">
                              {event.start_time}
                            </div>
                          )}

                          {event.scores && matchType && (
                            <div className="text-xs text-muted-foreground">
                              {event.scores.home} - {event.scores.away}
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
