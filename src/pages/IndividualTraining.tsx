import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { IndividualTrainingDashboard } from '@/components/individual-training/IndividualTrainingDashboard';
import { useAuth } from '@/contexts/AuthContext';

const IndividualTraining = () => {
  const { user, connectedPlayers } = useAuth();

  // Convert connected players to the format expected by the dashboard
  const userPlayers = connectedPlayers?.map(cp => ({
    id: cp.id,
    name: cp.name,
    team_id: cp.team?.id || ''
  })) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Individual Training Plans</h1>
            <p className="text-muted-foreground">
              Manage personalized training programs and track progress
            </p>
          </div>
        </div>

        <IndividualTrainingDashboard 
          userId={user?.id || ''} 
          userPlayers={userPlayers}
        />
      </div>
    </DashboardLayout>
  );
};

export default IndividualTraining;