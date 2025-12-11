import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  CheckCircle2,
  Users,
  MoreVertical,
  Trash2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface IndividualTrainingDashboardProps {
  userId: string;
  userPlayers?: Array<{ id: string; name: string; team_id: string }>;
}

export function IndividualTrainingDashboard({ userId, userPlayers = [] }: IndividualTrainingDashboardProps) {
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [showDrillLibrary, setShowDrillLibrary] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [executingSessionId, setExecutingSessionId] = useState<string | null>(null);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // Get user's training plans
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['individual-training-plans', userId],
    queryFn: () => IndividualTrainingService.getUserPlans(userId),
  });

  // Delete plan mutation
  const deletePlanMutation = useMutation({
    mutationFn: (planId: string) => IndividualTrainingService.deletePlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['individual-training-plans'] });
      toast.success('Training plan deleted successfully');
      setPlanToDelete(null);
    },
    onError: (error) => {
      console.error('Error deleting plan:', error);
      toast.error('Failed to delete training plan');
    },
  });

  const handleDeletePlan = (planId: string) => {
    deletePlanMutation.mutate(planId);
  };

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
      <div className="space-y-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Individual Training</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage personalized training programs
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowDrillLibrary(true)} className="flex-1 sm:flex-none">
            <BookOpen className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Drill Library</span>
            <span className="sm:hidden">Drills</span>
          </Button>
          <Button size="sm" onClick={() => setShowCreatePlan(true)} className="flex-1 sm:flex-none">
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Create Plan</span>
            <span className="sm:hidden">Create</span>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Active Plans</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold">{activePlans.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold">{completedPlans.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">This Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">sessions</p>
          </CardContent>
        </Card>
        
        <Card className="hidden sm:block">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Streak</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold">7</div>
            <p className="text-xs text-muted-foreground">days</p>
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
                {activePlans.map((plan: any) => {
                  // Check if it's a group plan by looking at training_plan_players
                  const isGroupPlan = plan.is_group_plan || (plan.training_plan_players && plan.training_plan_players.length > 1);
                  const playerCount = plan.training_plan_players ? plan.training_plan_players.length : 1;
                  
                  return (
                    <Card key={plan.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="flex items-center gap-2">
                              {plan.title}
                              <Badge variant={plan.plan_type === 'ai' ? 'default' : 'secondary'}>
                                {plan.plan_type === 'ai' ? 'AI Generated' : plan.plan_type === 'coach' ? 'Coach Assigned' : 'Self Created'}
                              </Badge>
                              {isGroupPlan && (
                                <Badge variant="outline" className="text-blue-600 border-blue-600">
                                  <Users className="w-3 h-3 mr-1" />
                                  {playerCount} Players
                                </Badge>
                              )}
                            </CardTitle>
                            {plan.objective_text && (
                              <CardDescription className="mt-1">
                                {plan.objective_text}
                              </CardDescription>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedPlanId(plan.id)}
                            >
                              View Plan
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => setPlanToDelete(plan.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Plan
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Players in the plan (for group plans) */}
                          {isGroupPlan && plan.training_plan_players && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-muted-foreground">Players</h4>
                              <div className="flex flex-wrap gap-1">
                                {plan.training_plan_players.map((tpp: any) => (
                                  <Badge key={tpp.players.id} variant="outline" className="text-xs">
                                    {tpp.players.name}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
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
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="draft" className="space-y-4">
            {plans.filter(p => p.status === 'draft').map((plan) => (
              <Card key={plan.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {plan.title}
                        <Badge variant="outline">Draft</Badge>
                      </CardTitle>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => setPlanToDelete(plan.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Plan
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
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
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {plan.title}
                        <Badge variant="outline">Completed</Badge>
                      </CardTitle>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => setPlanToDelete(plan.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Plan
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!planToDelete} onOpenChange={() => setPlanToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Training Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this training plan? This action cannot be undone and will remove all associated sessions and progress data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => planToDelete && handleDeletePlan(planToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}