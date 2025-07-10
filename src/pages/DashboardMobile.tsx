
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Trophy, Plus, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LiveStats {
  playersCount: number;
  eventsCount: number;
  upcomingEvents: any[];
  recentResults: any[];
}

export default function DashboardMobile() {
  const { teams } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<LiveStats>({
    playersCount: 0,
    eventsCount: 0,
    upcomingEvents: [],
    recentResults: []
  });
  const [loading, setLoading] = useState(true);

  const currentTeam = teams?.[0];

  useEffect(() => {
    loadLiveData();
  }, [currentTeam]);

  const loadLiveData = async () => {
    if (!currentTeam) return;

    try {
      // Load players count
      const { count: playersCount } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', currentTeam.id);

      // Load upcoming events count
      const { count: eventsCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', currentTeam.id)
        .gte('date', new Date().toISOString().split('T')[0]);

      // Load upcoming events details
      const { data: upcomingEvents } = await supabase
        .from('events')
        .select('*')
        .eq('team_id', currentTeam.id)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(3);

      // Load recent completed events with results
      const { data: recentResults } = await supabase
        .from('events')
        .select('*')
        .eq('team_id', currentTeam.id)
        .lt('date', new Date().toISOString().split('T')[0])
        .not('scores', 'is', null)
        .order('date', { ascending: false })
        .limit(5);

      setStats({
        playersCount: playersCount || 0,
        eventsCount: eventsCount || 0,
        upcomingEvents: upcomingEvents || [],
        recentResults: recentResults || []
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'training': return 'bg-purple-50';
      case 'match':
      case 'fixture': return 'bg-red-50';
      default: return 'bg-blue-50';
    }
  };

  const getResultFromScores = (scores: any) => {
    if (!scores) return null;
    
    // Handle team scores (team_1, team_2, etc.)
    if (scores.team_1 !== undefined && scores.opponent_1 !== undefined) {
      const ourScore = scores.team_1;
      const opponentScore = scores.opponent_1;
      
      if (ourScore > opponentScore) return { result: 'Win', color: 'bg-green-500' };
      if (ourScore < opponentScore) return { result: 'Loss', color: 'bg-red-500' };
      return { result: 'Draw', color: 'bg-gray-500' };
    }
    
    // Handle home/away scores
    if (scores.home !== undefined && scores.away !== undefined) {
      // Assume we're home team for now - this should be determined by event.is_home
      const ourScore = scores.home;
      const opponentScore = scores.away;
      
      if (ourScore > opponentScore) return { result: 'Win', color: 'bg-green-500' };
      if (ourScore < opponentScore) return { result: 'Loss', color: 'bg-red-500' };
      return { result: 'Draw', color: 'bg-gray-500' };
    }
    
    return null;
  };

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
        {/* Live Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="touch-manipulation">
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold">{stats.playersCount}</div>
              <div className="text-sm text-muted-foreground">Players</div>
            </CardContent>
          </Card>
          <Card className="touch-manipulation">
            <CardContent className="p-4 text-center">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold">{stats.eventsCount}</div>
              <div className="text-sm text-muted-foreground">Upcoming Events</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/calendar">
              <Button className="w-full h-12 justify-start text-left" variant="outline">
                <Plus className="h-5 w-5 mr-3" />
                Create Event
              </Button>
            </Link>
            <Link to="/players">
              <Button className="w-full h-12 justify-start text-left" variant="outline">
                <Users className="h-5 w-5 mr-3" />
                Manage Players
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.upcomingEvents.length > 0 ? (
              stats.upcomingEvents.map((event) => (
                <div key={event.id} className={`flex items-center justify-between p-3 rounded-lg ${getEventTypeColor(event.event_type)}`}>
                  <div>
                    <div className="font-medium">
                      {event.event_type === 'training' ? event.title : `vs ${event.opponent || 'TBD'}`}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(event.date).toLocaleDateString()} {event.start_time && `, ${event.start_time}`}
                    </div>
                  </div>
                  <Badge variant="outline">
                    {event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1)}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No upcoming events</p>
            )}
            <Link to="/calendar">
              <Button variant="ghost" className="w-full h-10">
                View All Events
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Performance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Recent Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentResults.length > 0 ? (
              <div className="space-y-3">
                {stats.recentResults.map((event) => {
                  const result = getResultFromScores(event.scores);
                  return (
                    <div key={event.id} className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium">vs {event.opponent}</span>
                        <div className="text-xs text-muted-foreground">
                          {new Date(event.date).toLocaleDateString()}
                        </div>
                      </div>
                      {result && (
                        <Badge className={`text-white ${result.color}`}>
                          {result.result}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No recent results</p>
            )}
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}
