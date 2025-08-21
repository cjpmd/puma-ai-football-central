import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { IndividualTrainingService } from '@/services/individualTrainingService';
import { IndividualTrainingPlan, IndividualSessionCompletion } from '@/types/individualTraining';
import { Search, Eye, Calendar, TrendingUp, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface PlayerPlanProgressTableProps {
  plans: IndividualTrainingPlan[];
  players: Array<{
    id: string;
    name: string;
    team_id: string;
  }>;
  onRefresh: () => void;
}

interface PlayerProgress {
  playerId: string;
  playerName: string;
  activePlans: number;
  completedSessions: number;
  totalSessions: number;
  completionRate: number;
  lastActivity: string;
  status: 'on_track' | 'behind' | 'inactive';
}

export const PlayerPlanProgressTable: React.FC<PlayerPlanProgressTableProps> = ({
  plans,
  players,
  onRefresh
}) => {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [playerProgress, setPlayerProgress] = useState<PlayerProgress[]>([]);

  useEffect(() => {
    calculatePlayerProgress();
  }, [plans, players]);

  const calculatePlayerProgress = async () => {
    try {
      setLoading(true);
      const progressData: PlayerProgress[] = [];

      for (const player of players) {
        const playerPlans = plans.filter(p => p.player_id === player.id && p.status === 'active');
        let totalSessions = 0;
        let completedSessions = 0;
        let lastActivity = 'Never';

        // Get session data for each active plan
        for (const plan of playerPlans) {
          try {
            const sessions = await IndividualTrainingService.getPlanSessions(plan.id);
            totalSessions += sessions.length;

            // Check completion status for each session
            for (const session of sessions) {
              try {
                const completion = await IndividualTrainingService.getSessionCompletion(session.id, player.id);
                if (completion?.completed) {
                  completedSessions++;
                  if (completion.completed_date > lastActivity || lastActivity === 'Never') {
                    lastActivity = completion.completed_date;
                  }
                }
              } catch (error) {
                // Session not completed, continue
              }
            }
          } catch (error) {
            console.error(`Error loading sessions for plan ${plan.id}:`, error);
          }
        }

        const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;
        
        // Determine status based on completion rate and recent activity
        let status: 'on_track' | 'behind' | 'inactive' = 'inactive';
        if (lastActivity !== 'Never') {
          const daysSinceActivity = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
          if (completionRate >= 70) {
            status = 'on_track';
          } else if (daysSinceActivity <= 7) {
            status = 'on_track';
          } else {
            status = 'behind';
          }
        }

        progressData.push({
          playerId: player.id,
          playerName: player.name,
          activePlans: playerPlans.length,
          completedSessions,
          totalSessions,
          completionRate,
          lastActivity: lastActivity === 'Never' ? lastActivity : new Date(lastActivity).toLocaleDateString(),
          status
        });
      }

      setPlayerProgress(progressData);
    } catch (error) {
      console.error('Error calculating player progress:', error);
      toast.error('Failed to load player progress data');
    } finally {
      setLoading(false);
    }
  };

  const filteredProgress = playerProgress.filter(progress => {
    const matchesSearch = progress.playerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || progress.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'on_track':
        return <Badge variant="default" className="bg-green-100 text-green-800">On Track</Badge>;
      case 'behind':
        return <Badge variant="destructive">Behind</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on_track':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'behind':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'inactive':
        return <Calendar className="w-4 h-4 text-gray-600" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Player Progress</CardTitle>
          <CardDescription>Loading progress data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-12 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Player Progress Tracking
        </CardTitle>
        <CardDescription>
          Monitor individual training plan progress and completion rates for all players
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="on_track">On Track</SelectItem>
              <SelectItem value="behind">Behind Schedule</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Progress Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Active Plans</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Completion Rate</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProgress.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-8 h-8 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {searchTerm || statusFilter !== 'all' 
                          ? 'No players match your filters' 
                          : 'No progress data available'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProgress.map((progress) => (
                  <TableRow key={progress.playerId}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(progress.status)}
                        <span className="font-medium">{progress.playerName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {progress.activePlans} plan{progress.activePlans !== 1 ? 's' : ''}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Progress 
                            value={progress.completionRate} 
                            className="w-full h-2"
                          />
                        </div>
                        <span className="text-sm text-muted-foreground min-w-0">
                          {progress.completedSessions}/{progress.totalSessions}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {progress.completionRate.toFixed(0)}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {progress.lastActivity}
                      </span>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(progress.status)}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          // Navigate to player-specific training view
                          window.location.href = `/individual-training?player=${progress.playerId}`;
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary Stats */}
        {filteredProgress.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-700">
                {filteredProgress.filter(p => p.status === 'on_track').length}
              </div>
              <div className="text-sm text-green-600">On Track</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-700">
                {filteredProgress.filter(p => p.status === 'behind').length}
              </div>
              <div className="text-sm text-yellow-600">Behind Schedule</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-700">
                {filteredProgress.filter(p => p.status === 'inactive').length}
              </div>
              <div className="text-sm text-gray-600">Inactive</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};