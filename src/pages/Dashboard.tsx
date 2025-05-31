
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TeamOverview } from "@/components/dashboard/TeamOverview";
import { UpcomingEvents } from "@/components/dashboard/UpcomingEvents";
import { PlayerList } from "@/components/dashboard/PlayerList";
import { ProtectedComponent } from "@/components/auth/ProtectedComponent";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthorization } from "@/contexts/AuthorizationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Trophy, Shirt, UserPlus, BarChart3 } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const { teams, user, profile } = useAuth();
  const { canManageUsers, canManageTeams, canManageClubs, canViewAnalytics } = useAuthorization();
  
  const hasTeams = teams.length > 0;

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
            <TeamOverview />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <UpcomingEvents />
              </div>
              <div className="md:col-span-1">
                <PlayerList />
              </div>
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
