import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { 
  Users, 
  TrendingUp, 
  Target, 
  Clock, 
  Award, 
  AlertTriangle,
  CheckCircle,
  Activity,
  Calendar,
  BarChart3
} from 'lucide-react';
import { IndividualTrainingService } from '@/services/individualTrainingService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  TeamIndividualTrainingOverview, 
  IndividualTrainingAnalytics,
  TeamCoachingInsight 
} from '@/types/individualTraining';

interface TeamCoachDashboardProps {
  teamId: string;
  coachId: string;
}

export const TeamCoachDashboard: React.FC<TeamCoachDashboardProps> = ({
  teamId,
  coachId
}) => {
  const [teamOverview, setTeamOverview] = useState<TeamIndividualTrainingOverview | null>(null);
  const [teamAnalytics, setTeamAnalytics] = useState<IndividualTrainingAnalytics[]>([]);
  const [coachingInsights, setCoachingInsights] = useState<TeamCoachingInsight[]>([]);
  const [teamPlayers, setTeamPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadTeamData();
  }, [teamId, coachId]);

  const loadTeamData = async () => {
    setLoading(true);
    try {
      const [overview, analytics, insights, players] = await Promise.all([
        IndividualTrainingService.getTeamTrainingOverview(teamId),
        IndividualTrainingService.getTeamAnalytics(teamId),
        IndividualTrainingService.getTeamCoachingInsights(teamId, coachId),
        loadTeamPlayers()
      ]);

      setTeamOverview(overview);
      setTeamAnalytics(analytics);
      setCoachingInsights(insights);
      setTeamPlayers(players);
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
        kit_number
      `)
      .eq('team_id', teamId);

    if (error) throw error;
    return data || [];
  };

  const generateTeamSummary = async () => {
    try {
      const summary = await IndividualTrainingService.generateTeamAnalyticsSummary(teamId);
      
      await IndividualTrainingService.createOrUpdateTeamOverview(teamId, coachId, {
        analytics_summary: summary,
        team_goals: teamOverview?.team_goals || [],
        focus_areas_summary: teamOverview?.focus_areas_summary || {}
      });

      toast.success('Team analytics summary updated');
      loadTeamData();
    } catch (error) {
      console.error('Error generating team summary:', error);
      toast.error('Failed to generate team summary');
    }
  };

  const markInsightAsAddressed = async (insightId: string) => {
    try {
      await IndividualTrainingService.markInsightAddressed(insightId);
      toast.success('Insight marked as addressed');
      loadTeamData();
    } catch (error) {
      console.error('Error marking insight as addressed:', error);
      toast.error('Failed to update insight');
    }
  };

  const getCompletionRateData = () => {
    return teamAnalytics.map((analytics, index) => {
      const player = teamPlayers.find(p => p.id === analytics.player_id);
      return {
        name: player ? `${player.first_name} ${player.last_name}` : `Player ${index + 1}`,
        completionRate: analytics.completion_rate,
        planned: analytics.total_sessions_planned,
        completed: analytics.total_sessions_completed
      };
    });
  };

  const getFocusAreaData = () => {
    const focusAreas: Record<string, number> = {};
    teamAnalytics.forEach(analytics => {
      Object.keys(analytics.focus_area_progress).forEach(area => {
        focusAreas[area] = (focusAreas[area] || 0) + 1;
      });
    });

    return Object.entries(focusAreas).map(([area, count]) => ({
      area: area.replace('_', ' '),
      count
    }));
  };

  const getInsightPriorityData = () => {
    const priorities = coachingInsights.reduce((acc, insight) => {
      acc[insight.priority_level] = (acc[insight.priority_level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const colors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444',
      critical: '#dc2626'
    };

    return Object.entries(priorities).map(([priority, count]) => ({
      priority,
      count,
      fill: colors[priority as keyof typeof colors]
    }));
  };

  const getOverallStats = () => {
    const totalPlayers = teamPlayers.length;
    const activeTrainingPlayers = new Set(teamAnalytics.map(a => a.player_id)).size;
    const avgCompletionRate = teamAnalytics.reduce((sum, a) => sum + a.completion_rate, 0) / teamAnalytics.length || 0;
    const totalSessionsCompleted = teamAnalytics.reduce((sum, a) => sum + a.total_sessions_completed, 0);
    const criticalInsights = coachingInsights.filter(i => i.priority_level === 'critical').length;

    return {
      totalPlayers,
      activeTrainingPlayers,
      avgCompletionRate,
      totalSessionsCompleted,
      criticalInsights
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

  const stats = getOverallStats();
  const completionData = getCompletionRateData();
  const focusAreaData = getFocusAreaData();
  const insightPriorityData = getInsightPriorityData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Team Individual Training Dashboard</h2>
          <p className="text-muted-foreground">Monitor and analyze individual training progress across your team</p>
        </div>
        <Button onClick={generateTeamSummary}>
          <BarChart3 className="h-4 w-4 mr-2" />
          Update Analytics
        </Button>
      </div>

      {/* Key Stats */}
      <div className="grid gap-4 md:grid-cols-5">
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
                <p className="text-sm font-medium text-muted-foreground">Active in Training</p>
                <p className="text-2xl font-bold">{stats.activeTrainingPlayers}</p>
              </div>
              <Activity className="h-8 w-8 text-green-600" />
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
                <p className="text-sm font-medium text-muted-foreground">Sessions Completed</p>
                <p className="text-2xl font-bold">{stats.totalSessionsCompleted}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical Insights</p>
                <p className="text-2xl font-bold">{stats.criticalInsights}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="players">Players</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Player Completion Rates</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={completionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="completionRate" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Focus Areas Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={focusAreaData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ area, count }) => `${area}: ${count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {focusAreaData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 60%)`} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Team Performance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={completionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="completionRate" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid gap-4">
            {coachingInsights.length === 0 ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  No coaching insights available. Insights will be generated based on team training patterns and performance data.
                </AlertDescription>
              </Alert>
            ) : (
              coachingInsights.map((insight) => (
                <Card key={insight.id} className={`border-l-4 ${
                  insight.priority_level === 'critical' ? 'border-l-red-500' :
                  insight.priority_level === 'high' ? 'border-l-orange-500' :
                  insight.priority_level === 'medium' ? 'border-l-yellow-500' : 'border-l-green-500'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            insight.priority_level === 'critical' ? 'destructive' :
                            insight.priority_level === 'high' ? 'destructive' :
                            insight.priority_level === 'medium' ? 'default' : 'secondary'
                          }>
                            {insight.priority_level}
                          </Badge>
                          <span className="text-sm text-muted-foreground capitalize">
                            {insight.insight_type.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-sm">
                          {JSON.stringify(insight.insight_data, null, 2)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Created: {new Date(insight.created_at).toLocaleDateString()}
                          {insight.addressed_at && ` • Addressed: ${new Date(insight.addressed_at).toLocaleDateString()}`}
                        </div>
                      </div>
                      
                      {insight.action_required && !insight.addressed_at && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => markInsightAsAddressed(insight.id)}
                        >
                          Mark Addressed
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="players" className="space-y-6">
          <div className="grid gap-4">
            {teamPlayers.map((player) => {
              const playerAnalytics = teamAnalytics.find(a => a.player_id === player.id);
              return (
                <Card key={player.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="font-medium">
                            {player.first_name} {player.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            #{player.kit_number} • {player.position}
                          </div>
                        </div>
                      </div>
                      
                      {playerAnalytics ? (
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Completion Rate</div>
                          <div className="flex items-center gap-2">
                            <Progress value={playerAnalytics.completion_rate} className="w-20 h-2" />
                            <span className="text-sm font-medium">
                              {Math.round(playerAnalytics.completion_rate)}%
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {playerAnalytics.total_sessions_completed}/{playerAnalytics.total_sessions_planned} sessions
                          </div>
                        </div>
                      ) : (
                        <Badge variant="outline">No training data</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};