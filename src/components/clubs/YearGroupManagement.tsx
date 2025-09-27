import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { YearGroupForm } from "./YearGroupForm";
import { YearGroupCard } from "./YearGroupCard";
import type { YearGroup } from "@/types/index";

interface YearGroupManagementProps {
  clubId: string;
  onTeamManagement?: (yearGroupId: string) => void;
}

export const YearGroupManagement = ({ clubId, onTeamManagement }: YearGroupManagementProps) => {
  const [yearGroups, setYearGroups] = useState<YearGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingYearGroup, setEditingYearGroup] = useState<YearGroup | null>(null);
  const [deletingYearGroup, setDeletingYearGroup] = useState<YearGroup | null>(null);
  const [submitting, setSubmitting] = useState(false);
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

      setYearGroups(enrichedYearGroups);
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
    if (onTeamManagement) {
      onTeamManagement(yearGroup.id);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingYearGroup(null);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Year Groups</h2>
          <p className="text-muted-foreground">
            Organize teams by age cohort (e.g., U8s, U10s, 2015s)
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Year Group
        </Button>
      </div>

      {yearGroups.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No year groups yet</h3>
            <p className="text-muted-foreground mb-4">
              Create year groups to organize your teams by age cohort
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Year Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {yearGroups.map((yearGroup: any) => (
            <YearGroupCard
              key={yearGroup.id}
              yearGroup={yearGroup}
              teamCount={yearGroup.teamCount}
              playerCount={yearGroup.playerCount}
              onEdit={handleEdit}
              onDelete={setDeletingYearGroup}
              onManageTeams={handleManageTeams}
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
    </div>
  );
};