
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TeamOverview } from "@/components/dashboard/TeamOverview";
import { UpcomingEvents } from "@/components/dashboard/UpcomingEvents";
import { ProtectedComponent } from "@/components/auth/ProtectedComponent";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthorization } from "@/contexts/AuthorizationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Trophy, Shirt, UserPlus, BarChart3, Timer } from "lucide-react";
import { ResultsSummary } from "@/components/analytics/ResultsSummary";
import { useQuery } from '@tanstack/react-query';
import { playersService } from '@/services/playersService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { teams, user, profile } = useAuth();
  const { canManageUsers, canManageTeams, canManageClubs, canViewAnalytics } = useAuthorization();
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.id || '');
  
  const hasTeams = teams.length > 0;

  // Fetch active players for team stats
  const { data: players = [] } = useQuery({
    queryKey: ['active-players', selectedTeamId],
    queryFn: () => selectedTeamId ? playersService.getActivePlayersByTeamId(selectedTeamId) : [],
    enabled: !!selectedTeamId,
  });

  // Calculate team statistics
  const teamStats = {
    totalGames: players.reduce((sum, player) => sum + (player.matchStats?.totalGames || 0), 0),
    totalMinutes: players.reduce((sum, player) => sum + (player.matchStats?.totalMinutes || 0), 0),
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {profile?.name || 'User'}. Here's what's happening with your teams.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              Subscription: Analytics+
            </div>
            {profile?.roles && profile.roles.length > 0 && (
              <div className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                Role: {profile.roles.map(role => 
                  role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
                ).join(', ')}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions for Admins */}
        <ProtectedComponent 
          permission={{ resource: 'users', action: 'manage' }}
          showFallback={false}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/users')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <UserPlus className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">User Management</p>
                    <p className="text-sm text-muted-foreground">Manage users & roles</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {canManageTeams && (
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/teams')}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Trophy className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Team Management</p>
                      <p className="text-sm text-muted-foreground">Manage teams</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {canManageClubs && (
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/clubs')}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Shirt className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">Club Management</p>
                      <p className="text-sm text-muted-foreground">Manage clubs</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {canViewAnalytics && (
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/analytics')}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <BarChart3 className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium">Analytics</p>
                      <p className="text-sm text-muted-foreground">View insights</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ProtectedComponent>

        {hasTeams ? (
          <>
            {/* Team Selection */}
            {teams.length > 1 && (
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Team Analytics</h2>
                <div className="min-w-[250px]">
                  <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Results Summary */}
            <ResultsSummary selectedTeamId={selectedTeamId} />

            {/* Team Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <BarChart3 className="h-4 w-4" />
                    Total Games
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-bold">{teamStats.totalGames}</div>
                  <div className="text-xs text-muted-foreground">
                    Across all players
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Timer className="h-4 w-4" />
                    Total Minutes
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-bold">{teamStats.totalMinutes}</div>
                  <div className="text-xs text-muted-foreground">
                    Playing time
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <TeamOverview />
            
            <div className="grid grid-cols-1 gap-6">
              <UpcomingEvents />
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Welcome to Team Manager!</h2>
            <p className="text-muted-foreground mb-6">
              {canManageTeams 
                ? "To get started, create your first team by clicking the button below."
                : "You don't have any team associations yet. Contact an administrator to get access to teams."
              }
            </p>
            {canManageTeams && (
              <Button 
                onClick={() => navigate("/teams")}
                className="bg-puma-blue-500 hover:bg-puma-blue-600"
              >
                Create Your First Team
              </Button>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
