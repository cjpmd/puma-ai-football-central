
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface DashboardStats {
  totalPlayers: number;
  upcomingEvents: number;
  nextEvent: {
    title: string;
    date: string;
    time: string;
    location: string;
    type: string;
  } | null;
  trainingHours: number;
  recentPlayers: Array<{
    id: string;
    name: string;
    status: 'new' | 'updated';
    date: string;
  }>;
}

export function TeamOverview() {
  const { teams } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalPlayers: 0,
    upcomingEvents: 0,
    nextEvent: null,
    trainingHours: 0,
    recentPlayers: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (teams.length > 0) {
      loadStats();
    }
  }, [teams]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const teamIds = teams.map(team => team.id);
      
      // Get total players
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, name, created_at, updated_at')
        .in('team_id', teamIds)
        .eq('status', 'active');

      if (playersError) throw playersError;

      // Get upcoming events
      const today = new Date().toISOString().split('T')[0];
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .in('team_id', teamIds)
        .gte('date', today)
        .order('date')
        .order('start_time');

      if (eventsError) throw eventsError;

      // Get training events from this month for hours calculation
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
      
      const { data: trainingData, error: trainingError } = await supabase
        .from('events')
        .select('*')
        .in('team_id', teamIds)
        .eq('event_type', 'training')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);

      if (trainingError) throw trainingError;

      // Calculate training hours (assuming 1.5 hours per session if not specified)
      const trainingHours = trainingData?.reduce((total, event) => {
        if (event.start_time && event.end_time) {
          const start = new Date(`2000-01-01T${event.start_time}`);
          const end = new Date(`2000-01-01T${event.end_time}`);
          return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        }
        return total + 1.5; // Default 1.5 hours if times not specified
      }, 0) || 0;

      // Get recent players (created or updated in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentPlayers = playersData?.filter(player => {
        const createdAt = new Date(player.created_at);
        const updatedAt = new Date(player.updated_at);
        return createdAt > thirtyDaysAgo || updatedAt > thirtyDaysAgo;
      }).map(player => ({
        id: player.id,
        name: player.name,
        status: new Date(player.created_at) > thirtyDaysAgo ? 'new' as const : 'updated' as const,
        date: new Date(player.created_at) > thirtyDaysAgo ? player.created_at : player.updated_at
      })).slice(0, 3) || [];

      // Get next event
      const nextEvent = eventsData?.[0] ? {
        title: eventsData[0].title,
        date: eventsData[0].date,
        time: eventsData[0].start_time || '',
        location: eventsData[0].location || '',
        type: eventsData[0].event_type
      } : null;

      setStats({
        totalPlayers: playersData?.length || 0,
        upcomingEvents: eventsData?.length || 0,
        nextEvent,
        trainingHours: Math.round(trainingHours),
        recentPlayers
      });

    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return <div className="text-center py-8">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Players</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.totalPlayers}</div>
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.recentPlayers.filter(p => p.status === 'new').length} new this month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.upcomingEvents}</div>
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.nextEvent ? `Next: ${formatDate(stats.nextEvent.date)}` : 'No upcoming events'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Training Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.trainingHours}</div>
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This month ({Math.ceil(stats.trainingHours / 1.5)} sessions)
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        <Card className="md:col-span-4">
          <CardHeader>
            <CardTitle>Next Event</CardTitle>
            {stats.nextEvent && (
              <CardDescription>
                {formatDate(stats.nextEvent.date)} • {formatTime(stats.nextEvent.time)}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {stats.nextEvent ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-puma-blue-50 p-2 rounded-lg">
                      <Calendar className="h-5 w-5 text-puma-blue-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{stats.nextEvent.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {stats.nextEvent.type.charAt(0).toUpperCase() + stats.nextEvent.type.slice(1)}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => window.location.href = '/calendar'}>
                    View Details
                  </Button>
                </div>
                
                <div className="pt-2 space-y-2">
                  {stats.nextEvent.time && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Start Time</span>
                      <span className="font-medium">{formatTime(stats.nextEvent.time)}</span>
                    </div>
                  )}
                  {stats.nextEvent.location && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Location</span>
                      <span className="font-medium">{stats.nextEvent.location}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No Upcoming Events</h3>
                <p className="text-muted-foreground mb-4">
                  No events scheduled. Create your first event to get started.
                </p>
                <Button onClick={() => window.location.href = '/calendar'}>
                  Create Event
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Recent Players</CardTitle>
            <CardDescription>New players and updates</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentPlayers.length > 0 ? (
              <div className="space-y-4">
                {stats.recentPlayers.map((player) => (
                  <div key={player.id} className="flex items-center">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-puma-blue-100 text-puma-blue-500">
                        {player.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="ml-3">
                      <div className="font-medium">{player.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {player.status === 'new' ? 'Added' : 'Updated'} {new Date(player.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="ml-auto text-xs bg-puma-green-100 text-puma-green-600 px-2 py-1 rounded-full">
                      {player.status === 'new' ? 'New' : 'Updated'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No Recent Activity</h3>
                <p className="text-muted-foreground text-sm">
                  No new players or updates in the last 30 days.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
