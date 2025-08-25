import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CoachPlanCreator } from './CoachPlanCreator';
import { PlayerPlanProgressTable } from './PlayerPlanProgressTable';
import { BulkPlanActions } from './BulkPlanActions';
import { IndividualTrainingService } from '@/services/individualTrainingService';
import { IndividualTrainingPlan } from '@/types/individualTraining';
import { Plus, BarChart3, Users, Activity } from 'lucide-react';
import { toast } from 'sonner';

interface CoachTrainingDashboardProps {
  userId: string;
  userPlayers: Array<{
    id: string;
    name: string;
    team_id: string;
  }>;
}

export const CoachTrainingDashboard: React.FC<CoachTrainingDashboardProps> = ({
  userId,
  userPlayers
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [plans, setPlans] = useState<IndividualTrainingPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCoachPlans();
  }, [userId]);

  const loadCoachPlans = async () => {
    try {
      setLoading(true);
      const coachPlans = await IndividualTrainingService.getUserPlans(userId);
      setPlans(coachPlans);
    } catch (error) {
      console.error('Error loading coach plans:', error);
      toast.error('Failed to load training plans');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanCreated = () => {
    loadCoachPlans();
    setShowCreatePlan(false);
    toast.success('Training plan created successfully');
  };

  const activePlansCount = plans.filter(p => p.status === 'active').length;
  const totalPlayers = userPlayers.length;
  const completedPlansCount = plans.filter(p => p.status === 'completed').length;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Individual Training Plans</h2>
          <p className="text-muted-foreground">
            Create and manage individual training plans for your players
          </p>
        </div>
        <Button onClick={() => setShowCreatePlan(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Plan
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Plans</p>
                <p className="text-2xl font-bold">{activePlansCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Players</p>
                <p className="text-2xl font-bold">{totalPlayers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Completed Plans</p>
                <p className="text-2xl font-bold">{completedPlansCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="progress">Player Progress</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Plans</CardTitle>
              <CardDescription>
                Latest individual training plans created for your players
              </CardDescription>
            </CardHeader>
            <CardContent>
              {plans.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No Training Plans Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first individual training plan to get started.
                  </p>
                  <Button onClick={() => setShowCreatePlan(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Plan
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    // Group plans by title, start_date, and group status
                    const groupedPlans = plans.reduce((acc, plan) => {
                      const key = `${plan.title}-${plan.start_date}-${plan.is_group_plan || false}`;
                      if (!acc[key]) {
                        acc[key] = {
                          ...plan,
                          playerIds: [],
                          players: [],
                          playerCount: 0
                        };
                      }
                      acc[key].playerIds.push(plan.player_id);
                      const player = userPlayers.find(p => p.id === plan.player_id);
                      if (player) {
                        acc[key].players.push(player);
                      }
                      acc[key].playerCount = acc[key].playerIds.length;
                      return acc;
                    }, {} as Record<string, any>);

                    return Object.values(groupedPlans).slice(0, 5).map((groupedPlan: any) => (
                      <div key={`${groupedPlan.title}-${groupedPlan.start_date}`} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{groupedPlan.title}</h4>
                            {groupedPlan.playerCount > 1 && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                                <Users className="w-3 h-3" />
                                {groupedPlan.playerCount} Players
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {groupedPlan.playerCount === 1 
                              ? `Player: ${groupedPlan.players[0]?.name || 'Unknown'}`
                              : `Players: ${groupedPlan.players.map(p => p.name).join(', ')}`
                            } • {groupedPlan.status}
                          </p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(groupedPlan.start_date).toLocaleDateString()}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <PlayerPlanProgressTable 
            plans={plans}
            players={userPlayers}
            onRefresh={loadCoachPlans}
          />
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <BulkPlanActions 
            players={userPlayers}
            onPlanCreated={handlePlanCreated}
          />
        </TabsContent>
      </Tabs>

      {showCreatePlan && (
        <CoachPlanCreator
          open={showCreatePlan}
          onOpenChange={setShowCreatePlan}
          players={userPlayers}
          onPlanCreated={handlePlanCreated}
        />
      )}
    </div>
  );
};