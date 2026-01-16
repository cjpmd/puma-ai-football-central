import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Trophy, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ClubSummaryReportProps {
  clubId: string;
  clubName: string;
}

interface AgeGroupSummary {
  ageGroup: string;
  teamCount: number;
  playerCount: number;
}

interface ClubSummary {
  totalTeams: number;
  totalPlayers: number;
  ageGroups: AgeGroupSummary[];
}

export const ClubSummaryReport: React.FC<ClubSummaryReportProps> = ({ clubId, clubName }) => {
  const [summary, setSummary] = useState<ClubSummary>({
    totalTeams: 0,
    totalPlayers: 0,
    ageGroups: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSummary();
  }, [clubId]);

  const loadSummary = async () => {
    try {
      setLoading(true);

      // Get all teams linked to this club
      const { data: clubTeams, error: teamsError } = await supabase
        .from('club_teams')
        .select(`
          team_id,
          teams!inner (
            id,
            name,
            age_group
          )
        `)
        .eq('club_id', clubId);

      if (teamsError) throw teamsError;

      const teamIds = clubTeams?.map((ct: any) => ct.team_id) || [];
      const totalTeams = teamIds.length;

      // Get player counts per team
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id, team_id')
        .in('team_id', teamIds.length > 0 ? teamIds : ['no-teams']);

      if (playersError) throw playersError;

      const totalPlayers = players?.length || 0;

      // Group by age group
      const ageGroupMap = new Map<string, { teamCount: number; playerCount: number }>();
      
      clubTeams?.forEach((ct: any) => {
        const ageGroup = ct.teams?.age_group || 'Unspecified';
        const teamId = ct.team_id;
        
        if (!ageGroupMap.has(ageGroup)) {
          ageGroupMap.set(ageGroup, { teamCount: 0, playerCount: 0 });
        }
        
        const current = ageGroupMap.get(ageGroup)!;
        current.teamCount += 1;
        
        // Count players for this team
        const teamPlayers = players?.filter(p => p.team_id === teamId) || [];
        current.playerCount += teamPlayers.length;
      });

      const ageGroups: AgeGroupSummary[] = Array.from(ageGroupMap.entries())
        .map(([ageGroup, data]) => ({
          ageGroup,
          teamCount: data.teamCount,
          playerCount: data.playerCount
        }))
        .sort((a, b) => {
          // Sort by age group name (U7, U8, etc.)
          const aNum = parseInt(a.ageGroup.replace(/\D/g, '')) || 999;
          const bNum = parseInt(b.ageGroup.replace(/\D/g, '')) || 999;
          return aNum - bNum;
        });

      setSummary({
        totalTeams,
        totalPlayers,
        ageGroups
      });
    } catch (error) {
      console.error('Error loading club summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
          <CardContent className="pt-4 pb-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Trophy className="h-6 w-6 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-blue-700">{summary.totalTeams}</div>
            <div className="text-sm text-blue-600">Total Teams</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
          <CardContent className="pt-4 pb-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-green-700">{summary.totalPlayers}</div>
            <div className="text-sm text-green-600">Total Players</div>
          </CardContent>
        </Card>
      </div>

      {/* Age Group Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Breakdown by Age Group</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.ageGroups.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Age Group</TableHead>
                  <TableHead className="text-center">Teams</TableHead>
                  <TableHead className="text-center">Players</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.ageGroups.map((ag) => (
                  <TableRow key={ag.ageGroup}>
                    <TableCell>
                      <Badge variant="outline">{ag.ageGroup}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium">{ag.teamCount}</TableCell>
                    <TableCell className="text-center font-medium">{ag.playerCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No teams linked to this club yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
