import { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { IndividualTrainingDashboard } from '@/components/individual-training/IndividualTrainingDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { playersService } from '@/services/playersService';

const IndividualTrainingMobile = () => {
  const { user, connectedPlayers, teams } = useAuth();
  
  // Team players for coach/staff roles
  const [coachPlayers, setCoachPlayers] = useState<Array<{ id: string; name: string; team_id: string }>>([]);

  useEffect(() => {
    const loadTeamPlayers = async () => {
      if (!teams || teams.length === 0) {
        setCoachPlayers([]);
        return;
      }
      try {
        const teamIds = Array.from(new Set(teams.map(t => t.id)));
        const results = await Promise.all(teamIds.map(id => playersService.getActivePlayersByTeamId(id)));
        const flat = results.flat();
        // Map to minimal shape and dedupe by id
        const mapped = flat.map(p => ({ id: (p as any).id, name: (p as any).name, team_id: (p as any).teamId || (p as any).team_id }));
        const map = new Map<string, { id: string; name: string; team_id: string }>();
        mapped.forEach(p => map.set(p.id, p));
        setCoachPlayers(Array.from(map.values()));
      } catch (e) {
        console.error('Failed to load team players for coach:', e);
        setCoachPlayers([]);
      }
    };
    loadTeamPlayers();
  }, [teams, user?.id]);

  // Connected players (parent links)
  const parentLinkedPlayers = connectedPlayers?.map(cp => ({
    id: cp.id,
    name: cp.name,
    team_id: cp.team?.id || ''
  })) || [];

  // Combine coach team players and parent-linked players
  const combinedPlayers = (() => {
    const map = new Map<string, { id: string; name: string; team_id: string }>();
    [...coachPlayers, ...parentLinkedPlayers].forEach(p => map.set(p.id, p));
    return Array.from(map.values());
  })();

  return (
    <MobileLayout showTabs={false}>
      <div className="space-y-4">
        <IndividualTrainingDashboard 
          userId={user?.id || ''} 
          userPlayers={combinedPlayers}
        />
      </div>
    </MobileLayout>
  );
};

export default IndividualTrainingMobile;