
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { PushNotificationSetup } from '@/components/notifications/PushNotificationSetup';

interface MultiRoleDashboardProps {
  onNavigate?: (route: string) => void;
}

export const MultiRoleDashboard: React.FC<MultiRoleDashboardProps> = ({ onNavigate }) => {
  const { user, teams } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMobileDetection();
  const [isTeamsLoaded, setIsTeamsLoaded] = useState(false);

  useEffect(() => {
    if (teams) {
      setIsTeamsLoaded(true);
    }
  }, [teams]);

  const handleTeamNavigation = (teamId: string) => {
    if (onNavigate) {
      onNavigate(`/team/${teamId}`);
    } else {
      navigate(`/team/${teamId}`);
    }
  };

  const handleCreateTeam = () => {
    if (onNavigate) {
      onNavigate('/new-team');
    } else {
      navigate('/new-team');
    }
  };

  return (
    <div className="space-y-6">
      {/* Push Notification Setup */}
      <PushNotificationSetup />

      {user && (
        <Card>
          <CardHeader>
            <CardTitle>Welcome, {user.email}!</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You are logged in.</p>
          </CardContent>
        </Card>
      )}

      {isTeamsLoaded && teams && teams.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Your Teams</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => (
              <Card key={team.id} className="cursor-pointer hover:opacity-75 transition-opacity" onClick={() => handleTeamNavigation(team.id)}>
                <CardHeader>
                  <CardTitle>{team.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>View team details and manage players.</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Teams Yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You are not assigned to any team.</p>
            <Button onClick={handleCreateTeam}>Create a New Team</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
