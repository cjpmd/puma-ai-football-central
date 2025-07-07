
import { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Use the actual database event type from supabase
type DatabaseEventRow = {
  id: string;
  team_id: string;
  title: string;
  description?: string;
  date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  notes?: string;
  event_type: string;
  opponent?: string;
  is_home?: boolean;
  game_format?: string;
  game_duration?: number;
  scores?: any;
  player_of_match_id?: string;
  coach_notes?: string;
  staff_notes?: string;
  training_notes?: string;
  facility_id?: string;
  facility_booking_id?: string;
  meeting_time?: string;
  total_minutes?: number;
  teams?: any;
  kit_selection?: string;
  created_at: string;
  updated_at: string;
};

export default function CalendarEventsMobile() {
  const [events, setEvents] = useState<DatabaseEventRow[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { teams } = useAuth();

  useEffect(() => {
    loadEvents();
  }, [teams, currentDate]);

  const loadEvents = async () => {
    try {
      if (!teams || teams.length === 0) return;

      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('team_id', teams[0].id)
        .gte('date', monthStart.toISOString().split('T')[0])
        .lte('date', monthEnd.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load events',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(new Date(event.date), day));
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'match':
      case 'fixture':
        return 'bg-red-500';
      case 'training':
        return 'bg-blue-500';
      case 'friendly':
        return 'bg-green-500';
      case 'tournament':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const dayEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  return (
    <MobileLayout>
      <div className="space-y-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="h-10 w-10 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <h2 className="text-xl font-semibold">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="h-10 w-10 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Add Event Button */}
        <Button className="w-full h-12">
          <Plus className="h-4 w-4 mr-2" />
          Add Event
        </Button>

        {/* Mini Calendar */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(day => {
                const dayEvents = getEventsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());
                const isSelected = selectedDate && isSameDay(day, selectedDate);

                return (
                  <Button
                    key={day.toISOString()}
                    variant={isSelected ? "default" : "ghost"}
                    size="sm"
                    className={`
                      h-10 w-full p-1 relative
                      ${!isCurrentMonth ? 'opacity-30' : ''}
                      ${isToday ? 'ring-2 ring-primary' : ''}
                    `}
                    onClick={() => setSelectedDate(day)}
                  >
                    <div className="text-center">
                      <div className="text-sm">{format(day, 'd')}</div>
                      {dayEvents.length > 0 && (
                        <div className="flex justify-center mt-1">
                          <div className="w-1 h-1 bg-primary rounded-full" />
                        </div>
                      )}
                    </div>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Day Events */}
        {selectedDate && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {format(selectedDate, 'EEEE, MMMM d')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dayEvents.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No events scheduled
                </p>
              ) : (
                <div className="space-y-3">
                  {dayEvents.map((event) => (
                    <div key={event.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium">{event.title}</h4>
                        <Badge className={`text-white text-xs ${getEventTypeColor(event.event_type)}`}>
                          {event.event_type}
                        </Badge>
                      </div>
                      
                      {event.start_time && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="h-4 w-4 mr-2" />
                          {event.start_time}
                          {event.end_time && ` - ${event.end_time}`}
                        </div>
                      )}
                      
                      {event.location && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 mr-2" />
                          {event.location}
                        </div>
                      )}
                      
                      {event.opponent && (
                        <div className="text-sm text-muted-foreground">
                          vs {event.opponent}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Upcoming Events */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading events...</p>
              </div>
            ) : events.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No upcoming events
              </p>
            ) : (
              <div className="space-y-3">
                {events.slice(0, 3).map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{event.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(event.date), 'MMM d')}
                        {event.start_time && ` at ${event.start_time}`}
                      </div>
                    </div>
                    <Badge className={`text-white text-xs ${getEventTypeColor(event.event_type)}`}>
                      {event.event_type}
                    </Badge>
                  </div>
                ))}
                {events.length > 3 && (
                  <Button variant="ghost" className="w-full">
                    View All Events
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}
