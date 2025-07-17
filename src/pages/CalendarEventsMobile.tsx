
import { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO } from 'date-fns';
import { AvailabilityStatusBadge } from '@/components/events/AvailabilityStatusBadge';

export default function CalendarEventsMobile() {
  const { teams, user } = useAuth();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  const currentTeam = teams?.[0];

  const loadEvents = async () => {
    if (!currentTeam) return;

    setLoading(true);
    try {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('team_id', currentTeam.id)
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      if (error) throw error;

      setEvents(data || []);
    } catch (error: any) {
      console.error('Error loading events:', error);
      toast({
        title: 'Error',
        description: 'Failed to load events',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [currentDate, currentTeam]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.filter(event => event.date === dateStr);
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'training': return 'bg-blue-100 text-blue-800';
      case 'match':
      case 'fixture': return 'bg-red-100 text-red-800';
      case 'friendly': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Calendar</h1>
            {currentTeam && (
              <p className="text-sm text-muted-foreground">{currentTeam.name}</p>
            )}
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
              {day}
            </div>
          ))}
          {getDaysInMonth().map(date => {
            const dayEvents = getEventsForDate(date);
            const isSelected = selectedDate && format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
            
            return (
              <button
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                className={`
                  relative p-2 text-sm border rounded-lg min-h-12 
                  ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                  ${!isSameMonth(date, currentDate) ? 'text-gray-400' : ''}
                  ${isToday(date) ? 'bg-yellow-50 border-yellow-300' : ''}
                  hover:bg-gray-50 transition-colors
                `}
              >
                <div className="font-medium">{date.getDate()}</div>
                {dayEvents.length > 0 && (
                  <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Date Events */}
        {selectedDate && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {format(selectedDate, 'EEEE, MMMM d')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedEvents.length > 0 ? (
                <div className="space-y-3">
                  {selectedEvents.map((event) => (
                    <div key={event.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getEventTypeColor(event.event_type)}>
                            {event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1)}
                          </Badge>
                          {user && (
                            <AvailabilityStatusBadge 
                              eventId={event.id}
                              userId={user.id}
                            />
                          )}
                        </div>
                        <h3 className="font-medium">
                          {event.event_type === 'training' ? event.title : `vs ${event.opponent || 'TBD'}`}
                        </h3>
                        <div className="text-sm text-muted-foreground space-y-1">
                          {event.start_time && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {event.start_time}
                              {event.end_time && ` - ${event.end_time}`}
                            </div>
                          )}
                          {event.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {event.location}
                            </div>
                          )}
                          {event.game_format && (
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {event.game_format}
                            </div>
                          )}
                        </div>
                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No events scheduled for this date
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MobileLayout>
  );
}
