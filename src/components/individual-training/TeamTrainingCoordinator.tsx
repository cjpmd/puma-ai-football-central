import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Users, 
  TrendingUp, 
  Target, 
  Brain, 
  Calendar,
  Settings,
  Award,
  Zap,
  BarChart3,
  Clock,
  CheckCircle
} from 'lucide-react';
import { TeamCoachDashboard } from './TeamCoachDashboard';
import { PlayerAnalyticsDashboard } from './PlayerAnalyticsDashboard';
import { IndividualTrainingService } from '@/services/individualTrainingService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  TeamIndividualTrainingOverview,
  IndividualTrainingAnalytics 
} from '@/types/individualTraining';

interface TeamTrainingCoordinatorProps {
  teamId: string;
  userId: string;
  userRole: string;
}

export const TeamTrainingCoordinator: React.FC<TeamTrainingCoordinatorProps> = ({
  teamId,
  userId,
  userRole
}) => {
  const [teamOverview, setTeamOverview] = useState<TeamIndividualTrainingOverview | null>(null);
  const [teamPlayers, setTeamPlayers] = useState<any[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
  const [teamAnalytics, setTeamAnalytics] = useState<IndividualTrainingAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('team');

  useEffect(() => {
    loadTeamData();
  }, [teamId]);

  const loadTeamData = async () => {
    setLoading(true);
    try {
      const [overview, players, analytics] = await Promise.all([
        IndividualTrainingService.getTeamTrainingOverview(teamId),
        loadTeamPlayers(),
        IndividualTrainingService.getTeamAnalytics(teamId)
      ]);

      setTeamOverview(overview);
      setTeamPlayers(players);
      setTeamAnalytics(analytics);
    } catch (error) {
      console.error('Error loading team data:', error);
      toast.error('Failed to load team training data');
    } finally {
      setLoading(false);
    }
  };

  const loadTeamPlayers = async () => {
    const { data, error } = await supabase
      .from('players')
      .select(`
        id,
        first_name,
        last_name,
        position,
        kit_number,
        date_of_birth
      `)
      .eq('team_id', teamId)
      .order('kit_number');

    if (error) throw error;
    return data || [];
  };

  const generateAnalyticsForPlayer = async (playerId: string) => {
    try {
      // Mock analytics generation - in a real app, this would calculate from actual data
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const mockAnalytics = {
        player_id: playerId,
        analytics_period_start: startDate,
        analytics_period_end: endDate,
        total_sessions_planned: Math.floor(Math.random() * 20) + 10,
        total_sessions_completed: Math.floor(Math.random() * 15) + 5,
        completion_rate: Math.floor(Math.random() * 40) + 60, // 60-100%
        average_session_duration: Math.floor(Math.random() * 30) + 30, // 30-60 minutes
        improvement_metrics: {
          ball_control: Math.random() * 0.5 + 0.5,
          fitness: Math.random() * 0.3 + 0.7,
          shooting: Math.random() * 0.4 + 0.6
        },
        focus_area_progress: {
          ball_control: Math.floor(Math.random() * 30) + 70,
          agility: Math.floor(Math.random() * 25) + 75,
          finishing: Math.floor(Math.random() * 35) + 65
        },
        self_assessment: {
          confidence: Math.floor(Math.random() * 3) + 7, // 7-10
          motivation: Math.floor(Math.random() * 2) + 8, // 8-10
          difficulty: Math.floor(Math.random() * 3) + 5 // 5-8
        },
        recommendations_applied: Math.floor(Math.random() * 5) + 2,
        milestones_achieved: Math.floor(Math.random() * 4) + 1
      };

      await IndividualTrainingService.createAnalyticsRecord(mockAnalytics);
      toast.success('Analytics generated for player');
      loadTeamData();
    } catch (error) {
      console.error('Error generating analytics:', error);
      toast.error('Failed to generate analytics');
    }
  };

  const getPlayerAnalytics = (playerId: string) => {
    return teamAnalytics.find(a => a.player_id === playerId);
  };

  const getTeamStats = () => {
    const totalPlayers = teamPlayers.length;
    const playersWithAnalytics = new Set(teamAnalytics.map(a => a.player_id)).size;
    const avgCompletionRate = teamAnalytics.reduce((sum, a) => sum + a.completion_rate, 0) / teamAnalytics.length || 0;
    const totalSessionsCompleted = teamAnalytics.reduce((sum, a) => sum + a.total_sessions_completed, 0);

    return {
      totalPlayers,
      playersWithAnalytics,
      avgCompletionRate,
      totalSessionsCompleted,
      analyticsProgress: totalPlayers > 0 ? (playersWithAnalytics / totalPlayers) * 100 : 0
    };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats = getTeamStats();
  const isCoach = ['team_coach', 'team_manager', 'team_assistant_manager'].includes(userRole);

  if (activeView === 'player' && selectedPlayer) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setActiveView('team')}>
            ← Back to Team View
          </Button>
          <div>
            <h2 className="text-xl font-bold">
              {selectedPlayer.first_name} {selectedPlayer.last_name}
            </h2>
            <p className="text-muted-foreground">
              #{selectedPlayer.kit_number} • {selectedPlayer.position}
            </p>
          </div>
        </div>
        
        <PlayerAnalyticsDashboard 
          playerId={selectedPlayer.id}
          playerName={`${selectedPlayer.first_name} ${selectedPlayer.last_name}`}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Team Individual Training</h2>
          <p className="text-muted-foreground">
            Coordinate and monitor individual training across your team
          </p>
        </div>
        {isCoach && (
          <div className="flex gap-2">
            <Button 
              variant={activeView === 'team' ? 'default' : 'outline'}
              onClick={() => setActiveView('team')}
            >
              <Users className="h-4 w-4 mr-2" />
              Team View
            </Button>
            <Button 
              variant={activeView === 'coach' ? 'default' : 'outline'}
              onClick={() => setActiveView('coach')}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Coach Dashboard
            </Button>
          </div>
        )}
      </div>

      {activeView === 'coach' && isCoach ? (
        <TeamCoachDashboard teamId={teamId} coachId={userId} />
      ) : (
        <>
          {/* Team Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Players</p>
                    <p className="text-2xl font-bold">{stats.totalPlayers}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">With Analytics</p>
                    <p className="text-2xl font-bold">{stats.playersWithAnalytics}</p>
                    <Progress value={stats.analyticsProgress} className="w-full h-1 mt-2" />
                  </div>
                  <BarChart3 className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg Completion</p>
                    <p className="text-2xl font-bold">{Math.round(stats.avgCompletionRate)}%</p>
                  </div>
                  <Target className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
                    <p className="text-2xl font-bold">{stats.totalSessionsCompleted}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-indigo-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Players Grid */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Individual Training Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {teamPlayers.map((player) => {
                  const analytics = getPlayerAnalytics(player.id);
                  return (
                    <Card key={player.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div>
                              <div className="font-medium">
                                {player.first_name} {player.last_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                #{player.kit_number} • {player.position}
                              </div>
                            </div>
                            
                            {analytics ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Progress value={analytics.completion_rate} className="flex-1 h-2" />
                                  <span className="text-xs text-muted-foreground">
                                    {Math.round(analytics.completion_rate)}%
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {analytics.total_sessions_completed}/{analytics.total_sessions_planned} sessions
                                </div>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                No analytics yet
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex flex-col gap-1">
                            {analytics ? (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setSelectedPlayer(player);
                                  setActiveView('player');
                                }}
                              >
                                View Details
                              </Button>
                            ) : isCoach ? (
                              <Button 
                                size="sm" 
                                onClick={() => generateAnalyticsForPlayer(player.id)}
                              >
                                Generate
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              {teamPlayers.length === 0 && (
                <Alert>
                  <Users className="h-4 w-4" />
                  <AlertDescription>
                    No players found in this team. Add players to start individual training coordination.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};