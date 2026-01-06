import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { childProgressService, type ChildProgressData } from '@/services/childProgressService';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Calendar, Trophy, TrendingUp, TrendingDown, Minus, Clock, MapPin } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ChildSummaryCard } from '@/components/child-progress/ChildSummaryCard';
import { ChildMatchHistory } from '@/components/child-progress/ChildMatchHistory';
import { ChildTrainingProgress } from '@/components/child-progress/ChildTrainingProgress';
import { ChildCalendarView } from '@/components/child-progress/ChildCalendarView';

const ChildProgress = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<ChildProgressData[]>([]);
  const [selectedChild, setSelectedChild] = useState<ChildProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (user?.id) {
      loadChildrenData();
    }
  }, [user?.id]);

  const loadChildrenData = async () => {
    try {
      setLoading(true);
      const childrenData = await childProgressService.getChildrenForParent(user!.id);
      setChildren(childrenData);
      if (childrenData.length > 0) {
        setSelectedChild(childrenData[0]);
      }
    } catch (error) {
      console.error('Error loading children data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load child progress data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading child progress...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (children.length === 0) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">No Children Found</h2>
          <p className="text-muted-foreground mb-6">
            You don't have any children linked to your account yet.
          </p>
          <Button onClick={loadChildrenData}>Refresh</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Player Progress</h1>
            <Button onClick={loadChildrenData} variant="outline">
              Refresh Data
            </Button>
          </div>

          {/* Child Selection */}
          {children.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {children.map((child) => (
                <Button
                  key={child.id}
                  variant={selectedChild?.id === child.id ? 'default' : 'outline'}
                  onClick={() => setSelectedChild(child)}
                  className="gap-2"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={child.photo} />
                    <AvatarFallback>{child.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  {child.name}
                </Button>
              ))}
            </div>
          )}
        </div>

        {selectedChild && (
          <>
            {/* Summary Card */}
            <ChildSummaryCard child={selectedChild} />

            {/* Detailed Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="matches">Match History</TabsTrigger>
                <TabsTrigger value="training">Training</TabsTrigger>
                <TabsTrigger value="calendar">Calendar</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Recent Achievements */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        Recent Achievements
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedChild.recentAchievements.length > 0 ? (
                        selectedChild.recentAchievements.map((achievement, index) => (
                          <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                            <div className="flex-shrink-0">
                              {achievement.type === 'captain' && (
                                <div className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                                  <span className="text-[8px] font-bold text-white">C</span>
                                </div>
                              )}
                              {achievement.type === 'potm' && <Trophy className="h-4 w-4 text-yellow-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{achievement.title}</p>
                              <p className="text-xs text-muted-foreground">{achievement.description}</p>
                              <p className="text-xs text-muted-foreground">{achievement.date}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-sm">No recent achievements</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Performance Trend */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {selectedChild.performanceTrend === 'improving' && <TrendingUp className="h-5 w-5 text-green-500" />}
                        {selectedChild.performanceTrend === 'needs-work' && <TrendingDown className="h-5 w-5 text-red-500" />}
                        {selectedChild.performanceTrend === 'maintaining' && <Minus className="h-5 w-5 text-blue-500" />}
                        Performance Trend
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge 
                        variant={
                          selectedChild.performanceTrend === 'improving' ? 'default' :
                          selectedChild.performanceTrend === 'needs-work' ? 'destructive' : 'secondary'
                        }
                        className="mb-4"
                      >
                        {selectedChild.performanceTrend === 'improving' && 'Improving'}
                        {selectedChild.performanceTrend === 'needs-work' && 'Needs Work'}
                        {selectedChild.performanceTrend === 'maintaining' && 'Maintaining'}
                      </Badge>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Training Completion</span>
                          <span>{selectedChild.stats.trainingCompletionRate}%</span>
                        </div>
                        <Progress value={selectedChild.stats.trainingCompletionRate} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Upcoming Activities */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-blue-500" />
                        Upcoming Activities
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedChild.upcomingActivities.length > 0 ? (
                        selectedChild.upcomingActivities.slice(0, 3).map((activity) => (
                          <div key={activity.id} className="p-2 rounded-lg bg-muted/50">
                            <p className="font-medium text-sm">{activity.title}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <Clock className="h-3 w-3" />
                              <span>{activity.date}</span>
                              {activity.time && <span>at {activity.time}</span>}
                            </div>
                            {activity.location && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span>{activity.location}</span>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-sm">No upcoming activities</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="matches">
                <ChildMatchHistory child={selectedChild} />
              </TabsContent>

              <TabsContent value="training">
                <ChildTrainingProgress child={selectedChild} />
              </TabsContent>

              <TabsContent value="calendar">
                <ChildCalendarView child={selectedChild} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ChildProgress;