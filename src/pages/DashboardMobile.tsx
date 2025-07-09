
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Plus, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardMobile() {
  const { teams, profile } = useAuth();
  const currentTeam = teams?.[0];

  return (
    <MobileLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Welcome back{profile?.name ? `, ${profile.name}` : ''}!</CardTitle>
          </CardHeader>
          <CardContent>
            {currentTeam ? (
              <p className="text-sm text-muted-foreground">
                Managing {currentTeam.name}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Get started by creating your first team
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/calendar">
              <Button className="w-full h-12 justify-start text-left" variant="outline">
                <Plus className="h-5 w-5 mr-3" />
                Create Event
              </Button>
            </Link>
            <Link to="/players">
              <Button className="w-full h-12 justify-start text-left" variant="outline">
                <Users className="h-5 w-5 mr-3" />
                Manage Players
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Team Overview */}
        {currentTeam && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Team Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Age Group</span>
                  <span className="text-sm font-medium">{currentTeam.ageGroup}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Game Format</span>
                  <span className="text-sm font-medium">{currentTeam.gameFormat}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Season</span>
                  <span className="text-sm font-medium">
                    {currentTeam.seasonStart} - {currentTeam.seasonEnd}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-4">
                No recent activity yet
              </p>
              <Link to="/calendar">
                <Button variant="outline" size="sm">
                  View Calendar
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}
