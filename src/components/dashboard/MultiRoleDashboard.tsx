import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { PushNotificationSetup } from '@/components/notifications/PushNotificationSetup';

interface MultiRoleDashboardProps {
  onNavigate: (route: string) => void;
}

export const MultiRoleDashboard: React.FC<MultiRoleDashboardProps> = ({ onNavigate }) => {
  const { user, teams, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const isMobile = useMobileDetection();
  const [isTeamsLoaded, setIsTeamsLoaded] = useState(false);

  useEffect(() => {
    if (!authLoading && teams) {
      setIsTeamsLoaded(true);
    }
  }, [teams, authLoading]);

  const handleTeamNavigation = (teamId: string) => {
    router.push(`/team/${teamId}`);
  };

  return (
    <div className="space-y-6">
      {/* Push Notification Setup - Show once for mobile users */}
      {isMobile && (
        <PushNotificationSetup />
      )}

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
            <Button onClick={() => router.push('/new-team')}>Create a New Team</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
