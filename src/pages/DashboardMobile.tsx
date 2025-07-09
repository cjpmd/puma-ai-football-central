
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Trophy, Plus, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardMobile() {
  const { teams } = useAuth();
  const currentTeam = teams?.[0];

  return (
    <MobileLayout>
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="touch-manipulation">
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold">24</div>
              <div className="text-sm text-muted-foreground">Players</div>
            </CardContent>
          </Card>
          <Card className="touch-manipulation">
            <CardContent className="p-4 text-center">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold">5</div>
              <div className="text-sm text-muted-foreground">Events</div>
            </CardContent>
          </Card>
        </div>

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

        {/* Upcoming Events */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <div className="font-medium">Training Session</div>
                <div className="text-sm text-muted-foreground">Tomorrow, 6:00 PM</div>
              </div>
              <Badge variant="outline">Training</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div>
                <div className="font-medium">vs City United</div>
                <div className="text-sm text-muted-foreground">Sat, 2:00 PM</div>
              </div>
              <Badge variant="outline">Match</Badge>
            </div>
            <Link to="/calendar">
              <Button variant="ghost" className="w-full h-10">
                View All Events
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Performance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Recent Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Wins</span>
                <Badge className="bg-green-500">8</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Draws</span>
                <Badge variant="secondary">2</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Losses</span>
                <Badge variant="destructive">1</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}
