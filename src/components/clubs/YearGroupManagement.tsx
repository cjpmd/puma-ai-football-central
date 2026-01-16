import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Users, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { YearGroupForm } from "./YearGroupForm";
import { YearGroupCard } from "./YearGroupCard";
import { SplitTeamWizard } from "./SplitTeamWizard";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { YearGroup } from "@/types/index";

interface Team {
  id: string;
  name: string;
  age_group: string;
  year_group_id: string | null;
}

interface YearGroupManagementProps {
  clubId: string;
  onTeamManagement?: (yearGroupId: string) => void;
}

export const YearGroupManagement = ({ clubId, onTeamManagement }: YearGroupManagementProps) => {
  const [yearGroups, setYearGroups] = useState<YearGroup[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingYearGroup, setEditingYearGroup] = useState<YearGroup | null>(null);
  const [deletingYearGroup, setDeletingYearGroup] = useState<YearGroup | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedYearGroup, setSelectedYearGroup] = useState<YearGroup | null>(null);
  const [showTeamManagement, setShowTeamManagement] = useState(false);
  const [splittingYearGroup, setSplittingYearGroup] = useState<YearGroup | null>(null);
  const { toast } = useToast();

  const loadYearGroups = async () => {
    try {
      setLoading(true);
      
      // Load year groups with team/player counts
      const { data: yearGroupsData, error: yearGroupsError } = await supabase
        .from('year_groups')
        .select(`
          *,
          teams:teams(
            id,
            players:players(id)
          )
        `)
        .eq('club_id', clubId)
        .order('name');

      if (yearGroupsError) throw yearGroupsError;

      // Load all teams for this club
      const { data: clubTeamsData, error: clubTeamsError } = await supabase
        .from('club_teams')
        .select(`
          team_id,
          teams!inner(
            id,
            name,
            age_group,
            year_group_id
          )
        `)
        .eq('club_id', clubId);

      if (clubTeamsError) throw clubTeamsError;

      const enrichedYearGroups = (yearGroupsData || []).map(yg => ({
        id: yg.id,
        clubId: yg.club_id,
        name: yg.name,
        ageYear: yg.age_year,
        playingFormat: yg.playing_format,
        softPlayerLimit: yg.soft_player_limit,
        description: yg.description,
        createdAt: yg.created_at,
        updatedAt: yg.updated_at,
        teamCount: yg.teams?.length || 0,
        playerCount: yg.teams?.reduce((total: number, team: any) => total + (team.players?.length || 0), 0) || 0,
      }));

      const clubTeams = clubTeamsData?.map((ct: any) => ({
        id: ct.teams.id,
        name: ct.teams.name,
        age_group: ct.teams.age_group,
        year_group_id: ct.teams.year_group_id
      })) || [];

      setYearGroups(enrichedYearGroups);
      setTeams(clubTeams);
    } catch (error) {
      console.error('Error loading year groups:', error);
      toast({
        title: "Error",
        description: "Failed to load year groups",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clubId) {
      loadYearGroups();
    }
  }, [clubId]);

  const handleSubmit = async (data: Partial<YearGroup>) => {
    try {
      setSubmitting(true);
      
      const payload = {
        club_id: clubId,
        name: data.name,
        age_year: data.ageYear,
        playing_format: data.playingFormat,
        soft_player_limit: data.softPlayerLimit,
        description: data.description,
      };

      if (editingYearGroup) {
        const { error } = await supabase
          .from('year_groups')
          .update(payload)
          .eq('id', editingYearGroup.id);
        
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Year group updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('year_groups')
          .insert([payload]);
        
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Year group created successfully",
        });
      }

      setShowForm(false);
      setEditingYearGroup(null);
      loadYearGroups();
    } catch (error) {
      console.error('Error saving year group:', error);
      toast({
        title: "Error",
        description: "Failed to save year group",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingYearGroup) return;

    try {
      const { error } = await supabase
        .from('year_groups')
        .delete()
        .eq('id', deletingYearGroup.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Year group deleted successfully",
      });

      setDeletingYearGroup(null);
      loadYearGroups();
    } catch (error) {
      console.error('Error deleting year group:', error);
      toast({
        title: "Error",
        description: "Failed to delete year group",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (yearGroup: YearGroup) => {
    setEditingYearGroup(yearGroup);
    setShowForm(true);
  };

  const handleManageTeams = (yearGroup: YearGroup) => {
    setSelectedYearGroup(yearGroup);
    setShowTeamManagement(true);
  };

  const handleSplitTeam = (yearGroup: YearGroup) => {
    setSplittingYearGroup(yearGroup);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingYearGroup(null);
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

      loadYearGroups();
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

      loadYearGroups();
    } catch (error: any) {
      console.error('Error removing team from year group:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove team from year group',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading year groups...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-2xl font-bold">Year Groups</h2>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Organize teams by age cohort
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} size="sm" className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Year Group
        </Button>
      </div>

      {yearGroups.length === 0 ? (
        <Card>
          <CardContent className="p-4 sm:p-6 text-center">
            <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">No year groups yet</h3>
            <p className="text-muted-foreground text-xs sm:text-sm mb-4">
              Create year groups to organize your teams
            </p>
            <Button onClick={() => setShowForm(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create First Year Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {yearGroups.map((yearGroup: any) => (
            <YearGroupCard
              key={yearGroup.id}
              yearGroup={yearGroup}
              teamCount={yearGroup.teamCount}
              playerCount={yearGroup.playerCount}
              onEdit={handleEdit}
              onDelete={setDeletingYearGroup}
              onManageTeams={handleManageTeams}
              onSplitTeam={handleSplitTeam}
            />
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingYearGroup ? "Edit Year Group" : "Create Year Group"}
            </DialogTitle>
          </DialogHeader>
          <YearGroupForm
            clubId={clubId}
            yearGroup={editingYearGroup}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={submitting}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog 
        open={!!deletingYearGroup} 
        onOpenChange={() => setDeletingYearGroup(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Year Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingYearGroup?.name}"? 
              This action cannot be undone and will affect all teams in this year group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Team Management Modal - Mobile Optimized */}
      <Dialog open={showTeamManagement} onOpenChange={setShowTeamManagement}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-3 sm:p-6">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowTeamManagement(false)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base sm:text-lg truncate">Manage Teams - {selectedYearGroup?.name}</DialogTitle>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Assign and organize teams
                </p>
              </div>
            </div>
          </DialogHeader>
          
          {selectedYearGroup && (
            <TeamManagementContent
              yearGroup={selectedYearGroup}
              teams={teams}
              yearGroups={yearGroups}
              onAssignTeam={assignTeamToYearGroup}
              onRemoveTeam={removeTeamFromYearGroup}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Split Team Wizard */}
      {splittingYearGroup && (
        <SplitTeamWizard
          yearGroup={splittingYearGroup}
          isOpen={!!splittingYearGroup}
          onClose={() => setSplittingYearGroup(null)}
          onComplete={loadYearGroups}
        />
      )}
    </div>
  );
};

// Team Management Content Component
interface TeamManagementContentProps {
  yearGroup: YearGroup;
  teams: Team[];
  yearGroups: YearGroup[];
  onAssignTeam: (teamId: string, yearGroupId: string) => void;
  onRemoveTeam: (teamId: string) => void;
}

const TeamManagementContent = ({ 
  yearGroup, 
  teams, 
  yearGroups,
  onAssignTeam, 
  onRemoveTeam 
}: TeamManagementContentProps) => {
  const assignedTeams = teams.filter(team => team.year_group_id === yearGroup.id);
  const unassignedTeams = teams.filter(team => !team.year_group_id);
  const otherAssignedTeams = teams.filter(team => team.year_group_id && team.year_group_id !== yearGroup.id);

  return (
    <div className="space-y-6">
      {/* Year Group Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {yearGroup.name}
            {yearGroup.playingFormat && (
              <Badge variant="secondary">{yearGroup.playingFormat}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            {yearGroup.description || 'No description provided'}
            {yearGroup.ageYear && ` • Born ${yearGroup.ageYear}`}
            {yearGroup.softPlayerLimit && ` • Target: ${yearGroup.softPlayerLimit} players per team`}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Currently Assigned Teams */}
      <Card>
        <CardHeader>
          <CardTitle>Teams in {yearGroup.name}</CardTitle>
          <CardDescription>
            {assignedTeams.length} team{assignedTeams.length !== 1 ? 's' : ''} currently assigned
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assignedTeams.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No teams assigned to this year group yet.</p>
              <p className="text-sm">Assign teams from the sections below.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignedTeams.map((team) => (
                <div key={team.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 border rounded-lg bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-sm truncate block">{team.name}</span>
                      <span className="text-muted-foreground text-xs">({team.age_group})</span>
                    </div>
                    <Badge variant="outline" className="text-green-700 border-green-300 text-xs flex-shrink-0">
                      Assigned
                    </Badge>
                  </div>
                  <Select 
                    onValueChange={(yearGroupId) => {
                      if (yearGroupId === 'remove') {
                        onRemoveTeam(team.id);
                      } else {
                        onAssignTeam(team.id, yearGroupId);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-40 h-8 text-xs">
                      <SelectValue placeholder="Move to..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="remove" className="text-red-600">
                        Remove from Year Group
                      </SelectItem>
                      <Separator />
                      {yearGroups.filter(yg => yg.id !== yearGroup.id).map((yg) => (
                        <SelectItem key={yg.id} value={yg.id}>
                          {yg.name} {yg.playingFormat && `(${yg.playingFormat})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unassigned Teams */}
      {unassignedTeams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-yellow-700 dark:text-yellow-300">Unassigned Teams</CardTitle>
            <CardDescription>
              These teams need to be assigned to a year group
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {unassignedTeams.map((team) => (
                <div key={team.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-sm truncate block">{team.name}</span>
                      <span className="text-muted-foreground text-xs">({team.age_group})</span>
                    </div>
                    <Badge variant="outline" className="text-yellow-700 border-yellow-300 text-xs flex-shrink-0">
                      Unassigned
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onAssignTeam(team.id, yearGroup.id)}
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 h-8 text-xs"
                  >
                    <Users className="h-3 w-3 mr-1" />
                    Assign
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teams in Other Year Groups */}
      {otherAssignedTeams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Teams in Other Year Groups</CardTitle>
            <CardDescription>
              Teams already assigned to other year groups
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {otherAssignedTeams.map((team) => {
                const assignedYearGroup = yearGroups.find(yg => yg.id === team.year_group_id);
                return (
                  <div key={team.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 border rounded-lg">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-sm truncate block">{team.name}</span>
                        <span className="text-muted-foreground text-xs">({team.age_group})</span>
                      </div>
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        <Users className="h-3 w-3 mr-1" />
                        {assignedYearGroup?.name}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onAssignTeam(team.id, yearGroup.id)}
                      className="w-full sm:w-auto h-8 text-xs"
                    >
                      Move here
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};