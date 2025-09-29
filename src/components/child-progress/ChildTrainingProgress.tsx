import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Target, TrendingUp, Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';
import { childProgressService } from '@/services/childProgressService';
import { toast } from '@/hooks/use-toast';
import type { ChildProgressData } from '@/services/childProgressService';

interface ChildTrainingProgressProps {
  child: ChildProgressData;
}

export const ChildTrainingProgress: React.FC<ChildTrainingProgressProps> = ({ child }) => {
  const [detailedData, setDetailedData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDetailedTrainingData();
  }, [child.id]);

  const loadDetailedTrainingData = async () => {
    try {
      setLoading(true);
      const data = await childProgressService.getDetailedChildProgress(child.id);
      setDetailedData(data);
    } catch (error) {
      console.error('Error loading detailed training data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load detailed training data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading training progress...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Training Progress</h2>

      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            Overall Training Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Completion Rate</span>
            <span className="text-lg font-bold">{child.stats.trainingCompletionRate}%</span>
          </div>
          <Progress value={child.stats.trainingCompletionRate} className="h-3" />
          
          {child.trainingAnalytics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
              <div className="text-center">
                <div className="text-xl font-bold text-green-600">
                  {child.trainingAnalytics.sessions_completed || 0}
                </div>
                <div className="text-sm text-muted-foreground">Sessions Completed</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-blue-600">
                  {child.trainingAnalytics.total_sessions || 0}
                </div>
                <div className="text-sm text-muted-foreground">Total Sessions</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-purple-600">
                  {child.trainingAnalytics.average_session_rating || 0}
                </div>
                <div className="text-sm text-muted-foreground">Avg Rating</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-orange-600">
                  {child.trainingAnalytics.streak_count || 0}
                </div>
                <div className="text-sm text-muted-foreground">Current Streak</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Focus Areas Progress */}
      {child.trainingAnalytics?.focus_area_progress && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Focus Areas Development
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(child.trainingAnalytics.focus_area_progress).map(([area, progress]: [string, any]) => (
              <div key={area} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize">{area.replace('_', ' ')}</span>
                  <span className="text-sm text-muted-foreground">{progress.current_level || 0}/5</span>
                </div>
                <Progress value={(progress.current_level || 0) * 20} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  Improvement: +{progress.improvement || 0} this month
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Training Plans */}
      {detailedData?.trainingPlans && detailedData.trainingPlans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              Training Plans
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {detailedData.trainingPlans.slice(0, 3).map((plan: any) => (
              <div key={plan.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold">{plan.plan_title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                  </div>
                  <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>
                    {plan.status}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Duration: {plan.duration_weeks} weeks</span>
                  <span>Difficulty: {plan.difficulty_level}/5</span>
                </div>

                {plan.focus_areas && plan.focus_areas.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {plan.focus_areas.map((area: string) => (
                      <Badge key={area} variant="outline" className="text-xs">
                        {area.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Session Progress */}
                {plan.individual_training_sessions && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Session Progress</span>
                      <span className="text-sm text-muted-foreground">
                        {plan.individual_training_sessions.filter((s: any) => 
                          s.individual_session_completions?.length > 0
                        ).length} / {plan.individual_training_sessions.length}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {plan.individual_training_sessions.map((session: any, index: number) => (
                        <div
                          key={session.id}
                          className={`h-2 flex-1 rounded ${
                            session.individual_session_completions?.length > 0
                              ? 'bg-green-500'
                              : 'bg-muted'
                          }`}
                          title={`Session ${index + 1}: ${session.session_title}`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {detailedData.trainingPlans.length > 3 && (
              <Button variant="outline" className="w-full">
                View All Training Plans ({detailedData.trainingPlans.length})
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Training Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-purple-500" />
            Recent Training Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {child.trainingAnalytics?.recent_activities ? (
            <div className="space-y-3">
              {child.trainingAnalytics.recent_activities.slice(0, 5).map((activity: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    {activity.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">{activity.date}</p>
                    </div>
                  </div>
                  {activity.rating && (
                    <Badge variant="outline">{activity.rating}/5</Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No recent training activity recorded
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};