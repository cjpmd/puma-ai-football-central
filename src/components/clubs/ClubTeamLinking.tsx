
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Link, Unlink, Users, AlertTriangle, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface Team {
  id: string;
  name: string;
  age_group: string;
  club_id: string | null;
  year_group_id: string | null;
}

interface YearGroup {
  id: string;
  name: string;
  playing_format?: string;
}

interface ClubTeamLinkingProps {
  clubId: string;
  clubName: string;
  onTeamLinked?: () => void;
}

export const ClubTeamLinking: React.FC<ClubTeamLinkingProps> = ({
  clubId,
  clubName,
  onTeamLinked
}) => {
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [linkedTeams, setLinkedTeams] = useState<Team[]>([]);
  const [yearGroups, setYearGroups] = useState<YearGroup[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadTeams();
  }, [clubId]);

  const loadTeams = async () => {
    try {
      setLoading(true);
      
      // Load all teams with year group info
      const { data: allTeams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, age_group, club_id, year_group_id');

      if (teamsError) throw teamsError;

      // Load year groups for this club
      const { data: yearGroupsData, error: yearGroupsError } = await supabase
        .from('year_groups')
        .select('id, name, playing_format')
        .eq('club_id', clubId)
        .order('name');

      if (yearGroupsError) throw yearGroupsError;

      // Load existing club-team relationships
      const { data: clubTeams, error: clubTeamsError } = await supabase
        .from('club_teams')
        .select('team_id')
        .eq('club_id', clubId);

      if (clubTeamsError) throw clubTeamsError;

      const linkedTeamIds = clubTeams?.map(ct => ct.team_id) || [];
      
      // Separate linked and available teams
      const linked = allTeams?.filter(team => linkedTeamIds.includes(team.id)) || [];
      const available = allTeams?.filter(team => !linkedTeamIds.includes(team.id) && !team.club_id) || [];

      setLinkedTeams(linked);
      setAvailableTeams(available);
      setYearGroups(yearGroupsData || []);
    } catch (error: any) {
      console.error('Error loading teams:', error);
      toast({
        title: 'Error',
        description: 'Failed to load teams',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const linkTeam = async () => {
    if (!selectedTeamId) return;

    try {
      // Add to club_teams table
      const { error: linkError } = await supabase
        .from('club_teams')
        .insert({ club_id: clubId, team_id: selectedTeamId });

      if (linkError) throw linkError;

      // Update team's club_id
      const { error: updateError } = await supabase
        .from('teams')
        .update({ club_id: clubId })
        .eq('id', selectedTeamId);

      if (updateError) throw updateError;

      toast({
        title: 'Team Linked',
        description: 'Team has been successfully linked to the club',
      });

      setSelectedTeamId('');
      loadTeams();
      onTeamLinked?.();
    } catch (error: any) {
      console.error('Error linking team:', error);
      toast({
        title: 'Error',
        description: 'Failed to link team to club',
        variant: 'destructive',
      });
    }
  };

  const unlinkTeam = async (teamId: string) => {
    try {
      // Remove from club_teams table
      const { error: unlinkError } = await supabase
        .from('club_teams')
        .delete()
        .eq('club_id', clubId)
        .eq('team_id', teamId);

      if (unlinkError) throw unlinkError;

      // Clear team's club_id
      const { error: updateError } = await supabase
        .from('teams')
        .update({ club_id: null })
        .eq('id', teamId);

      if (updateError) throw updateError;

      toast({
        title: 'Team Unlinked',
        description: 'Team has been unlinked from the club',
      });

      loadTeams();
      onTeamLinked?.();
    } catch (error: any) {
      console.error('Error unlinking team:', error);
      toast({
        title: 'Error',
        description: 'Failed to unlink team from club',
        variant: 'destructive',
      });
    }
  };

  const assignTeamToYearGroup = async (teamId: string, yearGroupId: string) => {
    try {
      const { error } = await supabase
        .from('teams')
        .update({ year_group_id: yearGroupId })
        .eq('id', teamId);

      if (error) throw error;

      toast({
        title: 'Team Assigned',
        description: 'Team has been assigned to the year group',
      });

      loadTeams();
      onTeamLinked?.();
    } catch (error: any) {
      console.error('Error assigning team to year group:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign team to year group',
        variant: 'destructive',
      });
    }
  };

  const removeTeamFromYearGroup = async (teamId: string) => {
    try {
      const { error } = await supabase
        .from('teams')
        .update({ year_group_id: null })
        .eq('id', teamId);

      if (error) throw error;

      toast({
        title: 'Team Removed',
        description: 'Team has been removed from the year group',
      });

      loadTeams();
      onTeamLinked?.();
    } catch (error: any) {
      console.error('Error removing team from year group:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove team from year group',
        variant: 'destructive',
      });
    }
  };

  // Group teams by year group
  const teamsGroupedByYearGroup = linkedTeams.reduce((acc, team) => {
    const key = team.year_group_id || 'unassigned';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(team);
    return acc;
  }, {} as Record<string, Team[]>);

  const unassignedTeams = teamsGroupedByYearGroup['unassigned'] || [];
  const assignedTeams = Object.entries(teamsGroupedByYearGroup).filter(([key]) => key !== 'unassigned');

  if (loading) {
    return <div>Loading team linking...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Link New Team - Mobile Optimized */}
      <Card>
        <CardHeader className="p-3 sm:p-4 pb-2">
          <CardTitle className="text-base sm:text-lg">Link Team to {clubName}</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Connect independent teams to this club</CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger className="w-full sm:flex-1">
                <SelectValue placeholder="Select a team to link" />
              </SelectTrigger>
              <SelectContent>
                {availableTeams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name} ({team.age_group})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={linkTeam} disabled={!selectedTeamId} className="w-full sm:w-auto">
              <Link className="mr-2 h-4 w-4" />
              Link Team
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Teams Grouped by Year Group */}
      {linkedTeams.length > 0 && (
        <div className="space-y-6">
          {/* Unassigned Teams Warning */}
          {unassignedTeams.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
              <CardHeader className="p-3 sm:p-4 pb-2">
                <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200 text-sm sm:text-base">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  Unassigned Teams
                </CardTitle>
                <CardDescription className="text-yellow-700 dark:text-yellow-300 text-xs sm:text-sm">
                  Assign these teams to a year group for better organization.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                <div className="space-y-2 sm:space-y-3">
                  {unassignedTeams.map((team) => (
                    <div key={team.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 border border-yellow-200 dark:border-yellow-800 rounded-lg bg-white dark:bg-gray-900">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="min-w-0 flex-1">
                          <span className="font-medium text-sm truncate block">{team.name}</span>
                          <span className="text-muted-foreground text-xs">{team.age_group}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Select onValueChange={(yearGroupId) => assignTeamToYearGroup(team.id, yearGroupId)}>
                          <SelectTrigger className="flex-1 sm:w-36 h-8 text-xs">
                            <SelectValue placeholder="Assign to..." />
                          </SelectTrigger>
                          <SelectContent>
                            {yearGroups.map((yg) => (
                              <SelectItem key={yg.id} value={yg.id}>
                                {yg.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="h-8 w-8 p-0 flex-shrink-0"
                          onClick={() => unlinkTeam(team.id)}
                        >
                          <Unlink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Teams by Year Group - Mobile Optimized */}
          {assignedTeams.map(([yearGroupId, teams]) => {
            const yearGroup = yearGroups.find(yg => yg.id === yearGroupId);
            return (
              <Card key={yearGroupId}>
                <CardHeader className="p-3 sm:p-4 pb-2">
                  <CardTitle className="flex flex-wrap items-center gap-2 text-sm sm:text-base">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    <span className="truncate">{yearGroup?.name || 'Unknown Year Group'}</span>
                    {yearGroup?.playing_format && (
                      <Badge variant="secondary" className="text-xs">{yearGroup.playing_format}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {teams.length} team{teams.length !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0">
                  <div className="space-y-2">
                    {teams.map((team) => (
                      <div key={team.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 sm:p-3 border rounded-lg">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="min-w-0 flex-1">
                            <span className="font-medium text-sm truncate block">{team.name}</span>
                            <span className="text-muted-foreground text-xs">{team.age_group}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <Select 
                            value={team.year_group_id || ''} 
                            onValueChange={(yearGroupId) => {
                              if (yearGroupId === 'remove') {
                                removeTeamFromYearGroup(team.id);
                              } else {
                                assignTeamToYearGroup(team.id, yearGroupId);
                              }
                            }}
                          >
                            <SelectTrigger className="flex-1 sm:w-36 h-8 text-xs">
                              <SelectValue placeholder="Move to..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="remove" className="text-red-600">
                                Remove
                              </SelectItem>
                              <Separator />
                              {yearGroups.filter(yg => yg.id !== team.year_group_id).map((yg) => (
                                <SelectItem key={yg.id} value={yg.id}>
                                  {yg.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-8 w-8 p-0 flex-shrink-0"
                            onClick={() => unlinkTeam(team.id)}
                          >
                            <Unlink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Empty State for All Teams Assigned */}
          {linkedTeams.length > 0 && unassignedTeams.length === 0 && assignedTeams.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">All teams organized!</h3>
                <p className="text-muted-foreground">
                  All linked teams have been assigned to year groups.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
