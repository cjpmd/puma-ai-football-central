
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users, Trophy, Target, Calendar, BarChart3 } from 'lucide-react';

export default function AnalyticsMobile() {
  return (
    <MobileLayout>
      <div className="space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="touch-manipulation">
            <CardContent className="p-4 text-center">
              <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
              <div className="text-2xl font-bold">8</div>
              <div className="text-sm text-muted-foreground">Wins</div>
            </CardContent>
          </Card>
          <Card className="touch-manipulation">
            <CardContent className="p-4 text-center">
              <Target className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold">73%</div>
              <div className="text-sm text-muted-foreground">Win Rate</div>
            </CardContent>
          </Card>
        </div>

        {/* Team Performance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Team Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Goals Scored</span>
                <Badge className="bg-green-500">32</Badge>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '80%' }}></div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Goals Conceded</span>
                <Badge variant="destructive">12</Badge>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-red-500 h-2 rounded-full" style={{ width: '30%' }}></div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Possession</span>
                <Badge variant="secondary">62%</Badge>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '62%' }}></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Results */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Recent Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <div className="font-medium">vs City United</div>
                <div className="text-sm text-muted-foreground">Last Saturday</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-green-600">3-1</div>
                <Badge className="bg-green-500 text-xs">Win</Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <div className="font-medium">vs Rovers FC</div>
                <div className="text-sm text-muted-foreground">2 weeks ago</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-blue-600">2-2</div>
                <Badge variant="secondary" className="text-xs">Draw</Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <div className="font-medium">vs Athletic</div>
                <div className="text-sm text-muted-foreground">3 weeks ago</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-green-600">4-0</div>
                <Badge className="bg-green-500 text-xs">Win</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div>
                <div className="font-medium">John Smith</div>
                <div className="text-sm text-muted-foreground">Top Scorer</div>
              </div>
              <Badge className="bg-yellow-500">12 Goals</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <div className="font-medium">Mike Johnson</div>
                <div className="text-sm text-muted-foreground">Most Assists</div>
              </div>
              <Badge className="bg-blue-500">8 Assists</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <div className="font-medium">David Wilson</div>
                <div className="text-sm text-muted-foreground">Clean Sheets</div>
              </div>
              <Badge className="bg-green-500">6 Clean Sheets</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}
