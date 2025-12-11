import { useState, useEffect } from 'react';
import { SafeDashboardLayout } from '@/components/layout/SafeDashboardLayout';
import { IndividualTrainingDashboard } from '@/components/individual-training/IndividualTrainingDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { playersService } from '@/services/playersService';

// Staff/coach roles that can see all team players
const STAFF_ROLES = [
  'admin', 'manager', 'team_manager', 'team_assistant_manager',
  'team_coach', 'team_helper', 'coach', 'staff', 
  'global_admin', 'club_admin', 'club_chair', 'club_secretary'
];

const hasStaffRole = (roles: string[] = []) => {
  return roles.some(role => STAFF_ROLES.includes(role));
};

const IndividualTraining = () => {
  const { user, connectedPlayers, profile, teams } = useAuth();
  const [teamPlayers, setTeamPlayers] = useState<Array<{ id: string; name: string; team_id: string }>>([]);

  const isStaff = hasStaffRole(profile?.roles || []);

  // Load all team players for staff roles
  useEffect(() => {
    const loadTeamPlayers = async () => {
      if (!isStaff || !teams || teams.length === 0) {
        setTeamPlayers([]);
        return;
      }
      try {
        const teamIds = Array.from(new Set(teams.map(t => t.id)));
        const results = await Promise.all(teamIds.map(id => playersService.getActivePlayersByTeamId(id)));
        const flat = results.flat();
        const mapped = flat.map(p => ({ id: (p as any).id, name: (p as any).name, team_id: (p as any).teamId || (p as any).team_id }));
        const map = new Map<string, { id: string; name: string; team_id: string }>();
        mapped.forEach(p => map.set(p.id, p));
        setTeamPlayers(Array.from(map.values()));
      } catch (e) {
        console.error('Failed to load team players:', e);
        setTeamPlayers([]);
      }
    };
    loadTeamPlayers();
  }, [teams, isStaff]);

  // Connected players for parent/player roles
  const linkedPlayers = connectedPlayers?.map(cp => ({
    id: cp.id,
    name: cp.name,
    team_id: cp.team?.id || ''
  })) || [];

  // Show all team players for staff, only linked players for parent/player
  const userPlayers = isStaff ? teamPlayers : linkedPlayers;

  return (
    <SafeDashboardLayout>
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
    </SafeDashboardLayout>
  );
};

export default IndividualTraining;