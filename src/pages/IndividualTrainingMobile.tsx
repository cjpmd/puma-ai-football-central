import { MobileLayout } from '@/components/layout/MobileLayout';
import { IndividualTrainingDashboard } from '@/components/individual-training/IndividualTrainingDashboard';
import { useAuth } from '@/contexts/AuthContext';

const IndividualTrainingMobile = () => {
  const { user, connectedPlayers } = useAuth();

  // Convert connected players to the format expected by the dashboard
  const userPlayers = connectedPlayers?.map(cp => ({
    id: cp.id,
    name: cp.name,
    team_id: cp.team?.id || ''
  })) || [];

  return (
    <MobileLayout 
      headerTitle="Individual Training"
      showTabs={false}
    >
      <div className="space-y-4">
        <IndividualTrainingDashboard 
          userId={user?.id || ''} 
          userPlayers={userPlayers}
        />
      </div>
    </MobileLayout>
  );
};

export default IndividualTrainingMobile;