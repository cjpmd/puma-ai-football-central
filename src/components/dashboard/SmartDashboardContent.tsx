import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useSmartView } from '@/contexts/SmartViewContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSmartNavigation } from '@/hooks/useSmartNavigation';
import { 
  Heart, 
  Users, 
  Trophy, 
  Building2, 
  Settings,
  Calendar,
  Dumbbell,
  BarChart3,
  Plus
} from 'lucide-react';

export function SmartDashboardContent() {
  const { currentView, getViewLabel, isMultiRoleUser } = useSmartView();
  const { teams, clubs, connectedPlayers, profile } = useAuth();
  const { quickActions } = useSmartNavigation();

  const getWelcomeMessage = () => {
    const viewLabels = getViewLabel(currentView);
    
    switch (currentView) {
      case 'parent':
        return {
          title: `Welcome back, Parent!`,
          description: `Track your ${connectedPlayers.length === 1 ? 'child\'s' : 'children\'s'} progress and stay updated with team activities.`,
          stats: [
            { label: 'Connected Children', value: connectedPlayers.length, icon: Heart },
            { label: 'Active Teams', value: connectedPlayers.filter(p => p.team).length, icon: Trophy }
          ]
        };
      
      case 'coach':
        return {
          title: `Coach Dashboard`,
          description: `Focus on player development and training session management.`,
          stats: [
            { label: 'Your Teams', value: teams.length, icon: Trophy },
            { label: 'Players to Develop', value: connectedPlayers.length, icon: Users }
          ]
        };
      
      case 'team_manager':
        return {
          title: `Team Management Hub`,
          description: `Comprehensive team management tools at your fingertips.`,
          stats: [
            { label: 'Teams Managed', value: teams.length, icon: Trophy },
            { label: 'Total Players', value: connectedPlayers.length, icon: Users }
          ]
        };
      
      case 'club_admin':
        return {
          title: `Club Administration`,
          description: `Manage multiple teams and oversee club operations.`,
          stats: [
            { label: 'Clubs', value: clubs.length, icon: Building2 },
            { label: 'Teams', value: teams.length, icon: Trophy },
            { label: 'Total Players', value: connectedPlayers.length, icon: Users }
          ]
        };
      
      case 'global_admin':
        return {
          title: `System Administration`,
          description: `Platform-wide management and oversight capabilities.`,
          stats: [
            { label: 'Total Clubs', value: clubs.length, icon: Building2 },
            { label: 'Total Teams', value: teams.length, icon: Trophy },
            { label: 'System Users', value: '∞', icon: Settings }
          ]
        };
        
      default:
        return {
          title: 'Welcome to Team Manager',
          description: 'Your sports management platform.',
          stats: []
        };
    }
  };

  const welcomeData = getWelcomeMessage();

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{welcomeData.title}</h1>
              {isMultiRoleUser && (
                <Badge variant="outline" className="text-xs">
                  Multi-Role User
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground max-w-2xl">
              {welcomeData.description}
            </p>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {welcomeData.stats.map((stat, index) => (
            <div key={index} className="flex items-center gap-3 bg-background/50 rounded-lg p-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <stat.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
                <div className="font-semibold">{stat.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Common tasks for your {getViewLabel(currentView).toLowerCase()} role
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {quickActions.map((action) => (
                <Link key={action.name} to={action.href}>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <action.icon className="h-4 w-4" />
                    {action.name}
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Context-Specific Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest updates relevant to your {getViewLabel(currentView).toLowerCase()} view
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentView === 'parent' && connectedPlayers.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Check your children's recent training sessions and upcoming matches.
                </div>
              )}
              {(currentView === 'coach' || currentView === 'team_manager') && teams.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Recent team activities and upcoming training sessions will appear here.
                </div>
              )}
              {currentView === 'club_admin' && clubs.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Club-wide activities and administrative updates will be shown here.
                </div>
              )}
              {currentView === 'global_admin' && (
                <div className="text-sm text-muted-foreground">
                  System-wide activities and administrative alerts will appear here.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Key Metrics
            </CardTitle>
            <CardDescription>
              Performance insights for your {getViewLabel(currentView).toLowerCase()} context
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentView === 'parent' && (
                <div className="text-sm text-muted-foreground">
                  Your children's progress and participation rates will be displayed here.
                </div>
              )}
              {(currentView === 'coach' || currentView === 'team_manager') && (
                <div className="text-sm text-muted-foreground">
                  Team performance metrics and training effectiveness data.
                </div>
              )}
              {currentView === 'club_admin' && (
                <div className="text-sm text-muted-foreground">
                  Club-wide performance metrics and operational insights.
                </div>
              )}
              {currentView === 'global_admin' && (
                <div className="text-sm text-muted-foreground">
                  Platform usage statistics and system health metrics.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}