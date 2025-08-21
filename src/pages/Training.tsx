import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DrillLibraryManager } from '@/components/training/DrillLibraryManager';
import { DrillCreator } from '@/components/training/DrillCreator';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CoachTrainingDashboard } from '@/components/training/CoachTrainingDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { playersService } from '@/services/playersService';
import { Plus, BookOpen, Users, Calendar } from 'lucide-react';
export default function Training() {
  const [activeTab, setActiveTab] = useState('library');
  const [showCreateDrill, setShowCreateDrill] = useState(false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Training Management</h1>
            <p className="text-muted-foreground">
              Manage your drill library and individual training plans
            </p>
          </div>
          <Button onClick={() => setShowCreateDrill(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Drill
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="library" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Drill Library
            </TabsTrigger>
            <TabsTrigger value="plans" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Individual Plans
            </TabsTrigger>
            <TabsTrigger value="sessions" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Team Sessions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Drill Library</CardTitle>
                <CardDescription>
                  Manage your collection of training drills that can be used across different training sessions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DrillLibraryManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="plans" className="space-y-4">
            <CoachTrainingDashboard 
              userId={user?.id || ''} 
              userPlayers={combinedPlayers}
            />
          </TabsContent>

          <TabsContent value="sessions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Team Training Sessions</CardTitle>
                <CardDescription>
                  View and manage team training sessions on the Calendar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">Team Training Sessions</h3>
                  <p className="text-muted-foreground mb-4">
                    Team training sessions are managed within individual events on the Calendar page.
                  </p>
                  <Button variant="outline" asChild>
                    <a href="/calendar">Go to Calendar</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {showCreateDrill && (
          <DrillCreator 
            open={showCreateDrill} 
            onOpenChange={setShowCreateDrill}
          />
        )}
      </div>
    </DashboardLayout>
  );
}