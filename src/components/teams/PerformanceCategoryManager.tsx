
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { playerStatsService } from '@/services/playerStatsService';

interface PerformanceCategory {
  id: string;
  name: string;
  description: string | null;
}

interface PerformanceCategoryManagerProps {
  teamId: string;
  onRefresh?: () => void;
}

export const PerformanceCategoryManager: React.FC<PerformanceCategoryManagerProps> = ({ 
  teamId, 
  onRefresh 
}) => {
  const [categories, setCategories] = useState<PerformanceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<PerformanceCategory | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (teamId) {
      loadCategories();
    }
  }, [teamId]);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('performance_categories')
        .select('id, name, description')
        .eq('team_id', teamId)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading performance categories:', error);
      toast({
        title: 'Error',
        description: 'Failed to load performance categories',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openForm = (category: PerformanceCategory | null = null) => {
    if (category) {
      setSelectedCategory(category);
      setName(category.name);
      setDescription(category.description || '');
    } else {
      setSelectedCategory(null);
      setName('');
      setDescription('');
    }
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (selectedCategory) {
        // Update existing category
        const { error } = await supabase
          .from('performance_categories')
          .update({
            name,
            description: description || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedCategory.id);

        if (error) throw error;
        
        // Update player stats to reflect category changes
        await updatePlayerStatsForTeam();
        
        toast({
          title: 'Success',
          description: 'Performance category updated successfully',
        });
      } else {
        // Create new category
        const { error } = await supabase
          .from('performance_categories')
          .insert({
            team_id: teamId,
            name,
            description: description || null
          });

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Performance category created successfully',
        });
      }

      setIsFormOpen(false);
      loadCategories();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error saving performance category:', error);
      toast({
        title: 'Error',
        description: 'Failed to save performance category',
        variant: 'destructive',
      });
    }
  };

  const updatePlayerStatsForTeam = async () => {
    try {
      // Get all players for this team and update their stats
      const { data: players, error } = await supabase
        .from('players')
        .select('id')
        .eq('team_id', teamId)
        .eq('status', 'active');

      if (error) throw error;

      // Update stats for each player
      for (const player of players || []) {
        await playerStatsService.updatePlayerStats(player.id);
      }
    } catch (error) {
      console.error('Error updating player stats for team:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // Check if this is the last category - don't allow deletion if it is
      if (categories.length <= 1) {
        toast({
          title: 'Cannot delete',
          description: 'You must keep at least one performance category',
          variant: 'destructive',
        });
        return;
      }
      
      const { error } = await supabase
        .from('performance_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Update player stats after category deletion
      await updatePlayerStatsForTeam();
      
      toast({
        title: 'Success',
        description: 'Performance category deleted successfully',
      });
      
      loadCategories();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error deleting performance category:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete performance category',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Performance Categories</h3>
        <Button 
          size="sm" 
          onClick={() => openForm()}
          className="bg-puma-blue-500 hover:bg-puma-blue-600"
        >
          <Plus className="h-4 w-4 mr-2" /> Add Category
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-4">Loading categories...</div>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No performance categories have been added yet.
            </p>
            <Button 
              onClick={() => openForm()}
              variant="outline"
              className="mt-4"
            >
              <Plus className="h-4 w-4 mr-2" /> Add a Category
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Card key={category.id} className="group hover:border-primary transition-colors">
              <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-medium">{category.name}</CardTitle>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openForm(category)} className="opacity-0 group-hover:opacity-100">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete "${category.name}"?`)) {
                        handleDelete(category.id);
                      }
                    }} 
                    className="opacity-0 group-hover:opacity-100 hover:text-destructive"
                    disabled={categories.length <= 1} // Prevent deleting if it's the only category
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              {category.description && (
                <CardContent className="py-2 px-4 border-t text-sm text-muted-foreground">
                  {category.description}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Category name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea 
                  id="description" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter a description of this performance category"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsFormOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
