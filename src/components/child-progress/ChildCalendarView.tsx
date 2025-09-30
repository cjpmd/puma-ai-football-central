import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Users, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { ChildProgressData } from '@/services/childProgressService';

interface ChildCalendarViewProps {
  child: ChildProgressData;
}

interface CalendarEvent {
  id: string;
  title: string;
  event_type: string;
  date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  description?: string;
  opponent?: string;
}

export const ChildCalendarView: React.FC<ChildCalendarViewProps> = ({ child }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week');

  useEffect(() => {
    loadCalendarEvents();
  }, [child.id, selectedPeriod]);

  const loadCalendarEvents = async () => {
    try {
      setLoading(true);
      
      const today = new Date();
      const startDate = new Date(today);
      const endDate = new Date(today);
      
      if (selectedPeriod === 'week') {
        startDate.setDate(today.getDate() - today.getDay()); // Start of week
        endDate.setDate(startDate.getDate() + 6); // End of week
      } else {
        startDate.setDate(1); // Start of month
        endDate.setMonth(today.getMonth() + 1, 0); // End of month
      }

      const { data: eventsData, error } = await supabase
        .from('events')
        .select('*')
        .eq('team_id', child.teamId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      setEvents(eventsData || []);
    } catch (error) {
      console.error('Error loading calendar events:', error);
      toast({
        title: 'Error',
        description: 'Failed to load calendar events',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'match':
        return <Users className="h-4 w-4" />;
      case 'training':
        return <Target className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'match':
        return 'bg-blue-500';
      case 'training':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (time?: string) => {
    if (!time) return '';
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const groupEventsByDate = (events: CalendarEvent[]) => {
    const grouped: { [key: string]: CalendarEvent[] } = {};
    events.forEach(event => {
      const date = event.date;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(event);
    });
    return grouped;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading calendar...</div>
        </CardContent>
      </Card>
    );
  }

  const groupedEvents = groupEventsByDate(events);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Calendar</h2>
        <div className="flex gap-2">
          <Button
            variant={selectedPeriod === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod('week')}
          >
            This Week
          </Button>
          <Button
            variant={selectedPeriod === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod('month')}
          >
            This Month
          </Button>
        </div>
      </div>

      {Object.keys(groupedEvents).length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Events Scheduled</h3>
              <p className="text-muted-foreground">
                No events found for the selected {selectedPeriod}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedEvents).map(([date, dayEvents]) => (
            <Card key={date}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  {formatDate(date)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {dayEvents.map((event) => (
                  <div key={event.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`p-1 rounded-full ${getEventColor(event.event_type)}`}>
                        {getEventIcon(event.event_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{event.title}</h4>
                            {event.opponent && (
                              <p className="text-sm text-muted-foreground">vs {event.opponent}</p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {event.event_type}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          {event.start_time && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{formatTime(event.start_time)}</span>
                              {event.end_time && (
                                <span>- {formatTime(event.end_time)}</span>
                              )}
                            </div>
                          )}
                          {event.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span>{event.location}</span>
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
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {selectedPeriod === 'week' ? 'This Week' : 'This Month'} Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {(() => {
              // Get all event types except 'match'
              const nonMatchEvents = events.filter(e => e.event_type !== 'match');
              const eventTypes = Array.from(new Set(nonMatchEvents.map(e => e.event_type)));
              
              const getTypeColor = (type: string) => {
                switch (type) {
                  case 'training':
                    return 'text-green-600';
                  case 'friendly':
                    return 'text-blue-600';
                  case 'tournament':
                    return 'text-orange-600';
                  case 'trial':
                    return 'text-yellow-600';
                  default:
                    return 'text-gray-600';
                }
              };

              const formatTypeName = (type: string) => {
                return type.charAt(0).toUpperCase() + type.slice(1);
              };

              return (
                <>
                  {eventTypes.map(type => (
                    <div key={type} className="text-center">
                      <div className={`text-2xl font-bold ${getTypeColor(type)}`}>
                        {nonMatchEvents.filter(e => e.event_type === type).length}
                      </div>
                      <div className="text-sm text-muted-foreground">{formatTypeName(type)}</div>
                    </div>
                  ))}
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {nonMatchEvents.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Events</div>
                  </div>
                </>
              );
            })()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};