
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TeamOverview } from './TeamOverview';
import { PlayerList } from './PlayerList';
import { UpcomingEvents } from './UpcomingEvents';
import { SimplifiedResultsSummary } from './SimplifiedResultsSummary';
import { Users, Calendar, Trophy, BarChart3 } from 'lucide-react';

export const MultiRoleDashboard = () => {
  const { user, teams, userRole } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Determine available tabs based on user role
  const getAvailableTabs = () => {
    const tabs = [
      { id: 'overview', label: 'Overview', icon: BarChart3 }
    ];

    if (userRole === 'staff' || userRole === 'admin') {
      tabs.push(
        { id: 'teams', label: 'Teams', icon: Trophy },
        { id: 'players', label: 'Players', icon: Users },
        { id: 'events', label: 'Events', icon: Calendar }
      );
    } else if (userRole === 'parent') {
      tabs.push(
        { id: 'my-children', label: 'My Children', icon: Users },
        { id: 'events', label: 'Events', icon: Calendar }
      );
    } else if (userRole === 'player') {
      tabs.push(
        { id: 'my-stats', label: 'My Stats', icon: BarChart3 },
        { id: 'events', label: 'Events', icon: Calendar }
      );
    }

    return tabs;
  };

  const availableTabs = getAvailableTabs();

  const renderTabContent = (tabId: string) => {
    switch (tabId) {
      case 'overview':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Teams Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {teams?.length > 0 ? (
                  <div className="space-y-3">
                    {teams.map((team) => (
                      <div key={team.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{team.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {team.category} • {team.ageGroup}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {team.players?.length || 0} players
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No teams available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Upcoming Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <UpcomingEvents />
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Recent Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SimplifiedResultsSummary />
              </CardContent>
            </Card>
          </div>
        );

      case 'teams':
        return (
          <div className="space-y-6">
            {teams?.map((team) => (
              <TeamOverview key={team.id} team={team} />
            ))}
          </div>
        );

      case 'players':
        return (
          <div className="space-y-6">
            {teams?.map((team) => (
              <Card key={team.id}>
                <CardHeader>
                  <CardTitle>{team.name} Squad</CardTitle>
                </CardHeader>
                <CardContent>
                  <PlayerList team={team} />
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case 'my-children':
        return (
          <Card>
            <CardHeader>
              <CardTitle>My Children</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                View your children's team information and progress here.
              </p>
            </CardContent>
          </Card>
        );

      case 'my-stats':
        return (
          <Card>
            <CardHeader>
              <CardTitle>My Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                View your personal statistics and performance metrics here.
              </p>
            </CardContent>
          </Card>
        );

      case 'events':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Events & Fixtures</CardTitle>
            </CardHeader>
            <CardContent>
              <UpcomingEvents />
            </CardContent>
          </Card>
        );

      default:
        return <div>Tab content not found</div>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.name || user?.email}
          </p>
        </div>

        {availableTabs.length > 1 ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
              {availableTabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {availableTabs.map((tab) => (
              <TabsContent key={tab.id} value={tab.id} className="mt-6">
                {renderTabContent(tab.id)}
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          renderTabContent('overview')
        )}
      </div>
    </DashboardLayout>
  );
};
