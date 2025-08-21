import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { IndividualTrainingService } from '@/services/individualTrainingService';
import { IndividualPlanCreator } from './IndividualPlanCreator';
import { PlayerDrillLibrary } from './PlayerDrillLibrary';
import { WeeklyPlanView } from './WeeklyPlanView';
import { SessionExecutionMode } from './SessionExecutionMode';
import { 
  Plus, 
  Calendar, 
  Clock, 
  Target, 
  TrendingUp,
  BookOpen,
  Play,
  CheckCircle2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface IndividualTrainingDashboardProps {
  userId: string;
  userPlayers?: Array<{ id: string; name: string; team_id: string }>;
}

export function IndividualTrainingDashboard({ userId, userPlayers = [] }: IndividualTrainingDashboardProps) {
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [showDrillLibrary, setShowDrillLibrary] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [executingSessionId, setExecutingSessionId] = useState<string | null>(null);

  // Get user's training plans
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['individual-training-plans', userId],
    queryFn: () => IndividualTrainingService.getUserPlans(userId),
  });

  const activePlans = plans.filter(plan => plan.status === 'active');
  const completedPlans = plans.filter(plan => plan.status === 'completed');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Individual Training Plans</h2>
          <p className="text-muted-foreground">
            Create and manage personalized training programs
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowDrillLibrary(true)}>
            <BookOpen className="w-4 h-4 mr-2" />
            Drill Library
          </Button>
          <Button onClick={() => setShowCreatePlan(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Plan
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePlans.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedPlans.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">sessions planned</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Streak</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-xs text-muted-foreground">days training</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      {plans.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Target className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Start Your Training Journey</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Create personalized training plans to improve your skills and track your progress.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => setShowCreatePlan(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Plan
              </Button>
              <Button variant="outline" onClick={() => setShowDrillLibrary(true)}>
                <BookOpen className="w-4 h-4 mr-2" />
                Browse Drills
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">Active Plans</TabsTrigger>
            <TabsTrigger value="draft">Draft Plans</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activePlans.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Play className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No Active Plans</h3>
                  <p className="text-muted-foreground mb-4">
                    Start a training plan to begin improving your skills.
                  </p>
                  <Button onClick={() => setShowCreatePlan(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Plan
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {activePlans.map((plan) => (
                  <Card key={plan.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                            {plan.title}
                            <Badge variant={plan.plan_type === 'ai' ? 'default' : 'secondary'}>
                              {plan.plan_type === 'ai' ? 'AI Generated' : plan.plan_type === 'coach' ? 'Coach Assigned' : 'Self Created'}
                            </Badge>
                          </CardTitle>
                          {plan.objective_text && (
                            <CardDescription className="mt-1">
                              {plan.objective_text}
                            </CardDescription>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedPlanId(plan.id)}
                        >
                          View Plan
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          {plan.focus_areas.map((area) => (
                            <Badge key={area} variant="outline">
                              {area}
                            </Badge>
                          ))}
                        </div>
                        
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(plan.start_date).toLocaleDateString()} - {new Date(plan.end_date).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {plan.weekly_sessions} sessions/week
                            </div>
                          </div>
                        </div>
                        
                        {/* Progress bar placeholder */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span>65%</span>
                          </div>
                          <Progress value={65} className="w-full" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="draft" className="space-y-4">
            {plans.filter(p => p.status === 'draft').map((plan) => (
              <Card key={plan.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {plan.title}
                    <Badge variant="outline">Draft</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    This plan is still being created. Continue building it to activate.
                  </p>
                  <Button onClick={() => setSelectedPlanId(plan.id)}>
                    Continue Building
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedPlans.map((plan) => (
              <Card key={plan.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {plan.title}
                    <Badge variant="outline">Completed</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Completed on {new Date(plan.updated_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}

      {/* Plan Creator Modal */}
      <IndividualPlanCreator
        open={showCreatePlan}
        onOpenChange={setShowCreatePlan}
        userPlayers={userPlayers}
      />

      {/* Drill Library Modal */}
      <PlayerDrillLibrary
        open={showDrillLibrary}
        onOpenChange={setShowDrillLibrary}
      />

      {/* Weekly Plan View Modal */}
      {selectedPlanId && (
        <WeeklyPlanView
          planId={selectedPlanId}
          open={!!selectedPlanId}
          onOpenChange={(open) => !open && setSelectedPlanId(null)}
          onExecuteSession={setExecutingSessionId}
        />
      )}

      {/* Session Execution Modal */}
      {executingSessionId && (
        <SessionExecutionMode
          sessionId={executingSessionId}
          open={!!executingSessionId}
          onOpenChange={(open) => !open && setExecutingSessionId(null)}
        />
      )}
    </div>
  );
}