import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Filter, Clock, MapPin, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MultiRoleAvailabilityControls } from '@/components/events/MultiRoleAvailabilityControls';
import { format, parseISO, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';

interface EventWithContext {
  id: string;
  title: string;
  date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  event_type: string;
  description?: string;
  team_context: {
    name: string;
    logo_url?: string;
  };
  role_context: string; // 'player', 'parent_of_John', 'staff_Team_A', etc.
}

interface RoleContext {
  type: 'player' | 'parent' | 'staff' | 'admin';
  id: string;
  name: string;
  context?: string;
}

interface RoleAwareCalendarProps {
  userId: string;
  activeRole: string;
  userRoles: RoleContext[];
}

export const RoleAwareCalendar: React.FC<RoleAwareCalendarProps> = ({
  userId,
  activeRole,
  userRoles
}) => {
  const { toast } = useToast();
  const [events, setEvents] = useState<EventWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'list'>('list');

  useEffect(() => {
    loadEvents();
  }, [userId, activeRole, currentDate]);

  const loadEvents = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const eventsWithContext: EventWithContext[] = [];

      // Get date range for the current view
      const startDate = startOfMonth(currentDate);
      const endDate = endOfMonth(addMonths(currentDate, 1));

      // If showing all roles or specific role, load relevant events
      const rolesToLoad = activeRole === 'all' ? userRoles : userRoles.filter(r => r.id === activeRole);

      for (const role of rolesToLoad) {
        let teamIds: string[] = [];

        // Determine which teams to load events for based on role
        if (role.type === 'player') {
          // Load events for teams where user is a player
          const { data: playerData } = await supabase
            .from('user_players')
            .select('players!inner(team_id)')
            .eq('user_id', userId)
            .eq('relationship', 'self');

          if (playerData) {
            teamIds = playerData.map(p => (p.players as any).team_id);
          }
        } else if (role.type === 'parent') {
          // Load events for teams where user's children play
          const { data: parentData } = await supabase
            .from('user_players')
            .select('players!inner(team_id)')
            .eq('user_id', userId)
            .eq('relationship', 'parent');

          if (parentData) {
            teamIds = parentData.map(p => (p.players as any).team_id);
          }
        } else if (role.type === 'staff') {
          // Load events for teams where user is staff
          const { data: staffData } = await supabase
            .from('user_staff')
            .select('team_staff!inner(team_id)')
            .eq('user_id', userId);

          if (staffData) {
            teamIds = staffData.map(s => (s.team_staff as any).team_id);
          }
        }

        // Remove duplicates
        teamIds = [...new Set(teamIds)];

        if (teamIds.length > 0) {
          // Load events for these teams
          const { data: eventData, error } = await supabase
            .from('events')
            .select(`
              id, title, date, start_time, end_time, location, event_type, description,
              teams!inner(id, name, logo_url)
            `)
            .in('team_id', teamIds)
            .gte('date', format(startDate, 'yyyy-MM-dd'))
            .lte('date', format(endDate, 'yyyy-MM-dd'))
            .order('date', { ascending: true });

          if (error) {
            console.error('Error loading events for role:', role, error);
            continue;
          }

          if (eventData) {
            const roleEvents = eventData.map(event => ({
              ...event,
              team_context: {
                name: event.teams.name,
                logo_url: event.teams.logo_url
              },
              role_context: `${role.type}_${role.id}`
            }));

            eventsWithContext.push(...roleEvents);
          }
        }
      }

      // Remove duplicate events (same event for multiple roles)
      const uniqueEvents = eventsWithContext.reduce((acc, event) => {
        const existingEvent = acc.find(e => e.id === event.id);
        if (existingEvent) {
          // Merge role contexts
          existingEvent.role_context += `, ${event.role_context}`;
        } else {
          acc.push(event);
        }
        return acc;
      }, [] as EventWithContext[]);

      setEvents(uniqueEvents);
    } catch (error: any) {
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

  const getEventTypeColor = (eventType: string) => {
    switch (eventType.toLowerCase()) {
      case 'match': return 'bg-red-100 text-red-800 border-red-200';
      case 'training': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'friendly': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleContextLabel = (roleContext: string) => {
    const contexts = roleContext.split(', ');
    return contexts.map(context => {
      const [type, id] = context.split('_');
      const role = userRoles.find(r => r.id === `${type}_${id}`);
      return role?.context || role?.name || type;
    }).join(', ');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendar
              {activeRole !== 'all' && (
                <Badge variant="outline">
                  {userRoles.find(r => r.id === activeRole)?.context || 'Role'}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              >
                Next
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground">
            {format(currentDate, 'MMMM yyyy')} • {events.length} events
          </p>
        </CardHeader>
      </Card>

      {/* Events List */}
      <div className="space-y-4">
        {events.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No events found for the selected period</p>
                <p className="text-sm">
                  {activeRole === 'all' 
                    ? 'Events will appear here when you have team or club connections'
                    : 'No events for this role in the current time period'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          events.map((event) => (
            <Card key={event.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{event.title}</h3>
                      <Badge className={getEventTypeColor(event.event_type)}>
                        {event.event_type}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{format(parseISO(event.date), 'EEEE, MMMM d, yyyy')}</span>
                        {event.start_time && (
                          <>
                            <Clock className="h-4 w-4 ml-2" />
                            <span>{event.start_time}</span>
                            {event.end_time && <span>- {event.end_time}</span>}
                          </>
                        )}
                      </div>
                      
                      {event.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{event.location}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{event.team_context.name}</span>
                      </div>
                      
                      {activeRole === 'all' && (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {getRoleContextLabel(event.role_context)}
                          </Badge>
                        </div>
                      )}
                      
                      {event.description && (
                        <p className="text-sm mt-2">{event.description}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Availability Controls */}
                  <div className="min-w-0">
                    <MultiRoleAvailabilityControls
                      eventId={event.id}
                      size="sm"
                      onStatusChange={(role, status) => {
                        toast({
                          title: 'Availability Updated',
                          description: `Marked as ${status} for ${event.title}`,
                        });
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};