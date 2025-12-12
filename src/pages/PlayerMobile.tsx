import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { childProgressService, type ChildProgressData } from '@/services/childProgressService';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { ChildSummaryCard } from '@/components/child-progress/ChildSummaryCard';
import { ChildMatchHistory } from '@/components/child-progress/ChildMatchHistory';
import { ChildCalendarView } from '@/components/child-progress/ChildCalendarView';
import { IndividualTrainingDashboard } from '@/components/individual-training/IndividualTrainingDashboard';
import { playersService } from '@/services/playersService';

const STAFF_ROLES = [
  'admin', 'manager', 'team_manager', 'team_assistant_manager',
  'team_coach', 'team_helper', 'coach', 'staff', 
  'global_admin', 'club_admin', 'club_chair', 'club_secretary'
];

const hasStaffRole = (roles: string[] = []) => {
  return roles.some(role => STAFF_ROLES.includes(role));
};

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'matches', label: 'Matches' },
  { id: 'training', label: 'Training' },
  { id: 'calendar', label: 'Calendar' }
];

const PlayerMobile = () => {
  const { user, connectedPlayers, profile, teams } = useAuth();
  const [children, setChildren] = useState<ChildProgressData[]>([]);
  const [selectedChild, setSelectedChild] = useState<ChildProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [teamPlayers, setTeamPlayers] = useState<Array<{ id: string; name: string; team_id: string }>>([]);

  // Swipe state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const isStaff = hasStaffRole(profile?.roles || []);

  // Load all team players for staff roles only
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

  useEffect(() => {
    if (user?.id) {
      loadChildrenData();
    }
  }, [user?.id]);

  const loadChildrenData = async () => {
    try {
      setLoading(true);
      const childrenData = await childProgressService.getChildrenForParent(user!.id);
      setChildren(childrenData);
      if (childrenData.length > 0) {
        setSelectedChild(childrenData[0]);
      }
    } catch (error) {
      console.error('Error loading children data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load player progress data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe || isRightSwipe) {
      const currentIndex = tabs.findIndex(tab => tab.id === activeTab);

      if (isLeftSwipe && currentIndex < tabs.length - 1) {
        setActiveTab(tabs[currentIndex + 1].id);
      } else if (isRightSwipe && currentIndex > 0) {
        setActiveTab(tabs[currentIndex - 1].id);
      }
    }
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading player progress...</div>
        </div>
      </MobileLayout>
    );
  }

  if (children.length === 0) {
    return (
      <MobileLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-bold mb-4">No Players Found</h2>
          <p className="text-muted-foreground mb-6 text-sm">
            You don't have any players linked to your account yet.
          </p>
          <Button onClick={loadChildrenData} size="sm">Refresh</Button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout 
      showTabs
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      stickyTabs
    >
      <div 
        className="space-y-4"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Player Selection */}
        {children.length > 1 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Select Player</CardTitle>
            </CardHeader>
            <CardContent>
              <Select 
                value={selectedChild?.id} 
                onValueChange={(childId) => {
                  const child = children.find(c => c.id === childId);
                  setSelectedChild(child || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a player" />
                </SelectTrigger>
                <SelectContent>
                  {children.map((child) => (
                    <SelectItem key={child.id} value={child.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={child.photo} />
                          <AvatarFallback>{child.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {child.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {selectedChild && (
          <>
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <ChildSummaryCard child={selectedChild} />
              </div>
            )}

            {activeTab === 'matches' && (
              <ChildMatchHistory child={selectedChild} />
            )}

            {activeTab === 'training' && (
              <IndividualTrainingDashboard 
                userId={user?.id || ''} 
                userPlayers={userPlayers}
              />
            )}

            {activeTab === 'calendar' && (
              <ChildCalendarView child={selectedChild} />
            )}
          </>
        )}
      </div>
    </MobileLayout>
  );
};

export default PlayerMobile;
