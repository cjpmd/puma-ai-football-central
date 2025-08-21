import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { 
  TrendingUp, 
  Target, 
  Clock, 
  Award, 
  Activity,
  Calendar,
  Brain,
  Zap,
  CheckCircle
} from 'lucide-react';
import { IndividualTrainingService } from '@/services/individualTrainingService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  IndividualTrainingAnalytics,
  IndividualPerformanceCorrelation 
} from '@/types/individualTraining';

interface PlayerAnalyticsDashboardProps {
  playerId: string;
  playerName: string;
}

export const PlayerAnalyticsDashboard: React.FC<PlayerAnalyticsDashboardProps> = ({
  playerId,
  playerName
}) => {
  const [analytics, setAnalytics] = useState<IndividualTrainingAnalytics[]>([]);
  const [correlations, setCorrelations] = useState<IndividualPerformanceCorrelation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('last30days');

  useEffect(() => {
    loadPlayerData();
  }, [playerId, selectedPeriod]);

  const loadPlayerData = async () => {
    setLoading(true);
    try {
      const periodDates = getPeriodDates(selectedPeriod);
      const [analyticsData, correlationsData] = await Promise.all([
        IndividualTrainingService.getPlayerAnalytics(playerId, periodDates.start, periodDates.end),
        IndividualTrainingService.getPlayerPerformanceCorrelations(playerId)
      ]);

      setAnalytics(analyticsData);
      setCorrelations(correlationsData);
    } catch (error) {
      console.error('Error loading player data:', error);
      toast.error('Failed to load player analytics');
    } finally {
      setLoading(false);
    }
  };

  const getPeriodDates = (period: string) => {
    const end = new Date();
    const start = new Date();
    
    switch (period) {
      case 'last7days':
        start.setDate(end.getDate() - 7);
        break;
      case 'last30days':
        start.setDate(end.getDate() - 30);
        break;
      case 'last90days':
        start.setDate(end.getDate() - 90);
        break;
      default:
        start.setDate(end.getDate() - 30);
    }
    
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  };

  const getProgressData = () => {
    return analytics.map((record, index) => ({
      period: `Period ${index + 1}`,
      completionRate: record.completion_rate,
      avgDuration: record.average_session_duration,
      sessionsCompleted: record.total_sessions_completed
    }));
  };

  const getFocusAreaProgress = () => {
    if (analytics.length === 0) return [];
    
    const latestAnalytics = analytics[0];
    return Object.entries(latestAnalytics.focus_area_progress).map(([area, progress]) => ({
      area: area.replace('_', ' '),
      progress: typeof progress === 'number' ? progress : 0,
      fullMark: 100
    }));
  };

  const getCorrelationData = () => {
    if (correlations.length === 0) return [];
    
    const latestCorrelation = correlations[0];
    return Object.entries(latestCorrelation.correlation_scores).map(([skill, score]) => ({
      skill: skill.replace('_', ' '),
      correlation: score * 100,
      confidence: latestCorrelation.confidence_level * 100
    }));
  };

  const getOverallStats = () => {
    if (analytics.length === 0) return {
      avgCompletionRate: 0,
      totalSessions: 0,
      avgDuration: 0,
      milestonesAchieved: 0,
      recommendationsApplied: 0
    };

    const latest = analytics[0];
    const totalSessions = analytics.reduce((sum, a) => sum + a.total_sessions_completed, 0);
    const avgCompletionRate = analytics.reduce((sum, a) => sum + a.completion_rate, 0) / analytics.length;
    const avgDuration = analytics.reduce((sum, a) => sum + a.average_session_duration, 0) / analytics.length;
    const milestonesAchieved = analytics.reduce((sum, a) => sum + a.milestones_achieved, 0);
    const recommendationsApplied = analytics.reduce((sum, a) => sum + a.recommendations_applied, 0);

    return {
      avgCompletionRate,
      totalSessions,
      avgDuration,
      milestonesAchieved,
      recommendationsApplied
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

  const progressData = getProgressData();
  const focusAreaData = getFocusAreaProgress();
  const correlationData = getCorrelationData();
  const stats = getOverallStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{playerName} - Training Analytics</h2>
          <p className="text-muted-foreground">Detailed performance analysis and improvement insights</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={selectedPeriod === 'last7days' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod('last7days')}
          >
            7 Days
          </Button>
          <Button 
            variant={selectedPeriod === 'last30days' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod('last30days')}
          >
            30 Days
          </Button>
          <Button 
            variant={selectedPeriod === 'last90days' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod('last90days')}
          >
            90 Days
          </Button>
        </div>
      </div>

      {/* Key Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Completion</p>
                <p className="text-2xl font-bold">{Math.round(stats.avgCompletionRate)}%</p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
                <p className="text-2xl font-bold">{stats.totalSessions}</p>
              </div>
              <Activity className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Duration</p>
                <p className="text-2xl font-bold">{Math.round(stats.avgDuration)}m</p>
              </div>
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Milestones</p>
                <p className="text-2xl font-bold">{stats.milestonesAchieved}</p>
              </div>
              <Award className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">AI Applied</p>
                <p className="text-2xl font-bold">{stats.recommendationsApplied}</p>
              </div>
              <Brain className="h-8 w-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="progress" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="progress">Progress Trends</TabsTrigger>
          <TabsTrigger value="focus">Focus Areas</TabsTrigger>
          <TabsTrigger value="correlation">Performance Links</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Data</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Completion Rate Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={progressData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="completionRate" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Session Duration Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={progressData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="avgDuration" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="focus" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Focus Area Development</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={focusAreaData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="area" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar name="Progress" dataKey="progress" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="correlation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Training-Performance Correlations</CardTitle>
              <p className="text-sm text-muted-foreground">
                How individual training correlates with match performance
              </p>
            </CardHeader>
            <CardContent>
              {correlationData.length === 0 ? (
                <Alert>
                  <TrendingUp className="h-4 w-4" />
                  <AlertDescription>
                    No performance correlations available yet. Correlations will be generated as more training and match data becomes available.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {correlationData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <div className="font-medium capitalize">{item.skill}</div>
                        <div className="text-sm text-muted-foreground">
                          Confidence: {Math.round(item.confidence)}%
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={item.correlation} className="w-24 h-2" />
                        <span className="text-sm font-medium w-12">
                          {Math.round(item.correlation)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-6">
          <div className="grid gap-4">
            {analytics.map((record, index) => (
              <Card key={record.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span className="font-medium">
                          {new Date(record.analytics_period_start).toLocaleDateString()} - {new Date(record.analytics_period_end).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Sessions: </span>
                          <span>{record.total_sessions_completed}/{record.total_sessions_planned}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Avg Duration: </span>
                          <span>{record.average_session_duration}min</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Milestones: </span>
                          <span>{record.milestones_achieved}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">AI Applied: </span>
                          <span>{record.recommendations_applied}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Completion Rate</div>
                      <div className="flex items-center gap-2">
                        <Progress value={record.completion_rate} className="w-20 h-2" />
                        <span className="text-sm font-medium">
                          {Math.round(record.completion_rate)}%
                        </span>
                      </div>
                      {record.coach_rating && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Coach Rating: {record.coach_rating}/5
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};