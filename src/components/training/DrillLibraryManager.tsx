import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DrillCreator } from './DrillCreator';
import { DrillEditModal } from './DrillEditModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Clock, 
  Users, 
  Play,
  Filter,
  Paperclip,
  X,
  Tag
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Drill {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  difficulty_level: string | null;
  is_public: boolean;
  created_by: string;
  created_at: string;
  drill_tags?: Array<{ id: string; name: string; color: string }>;
  drill_media?: Array<{ id: string; file_name: string; file_type: string; file_size: number | null; file_url: string }>;
}

export function DrillLibraryManager() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showCreateDrill, setShowCreateDrill] = useState(false);
  const [editingDrill, setEditingDrill] = useState<Drill | null>(null);
  
  const queryClient = useQueryClient();

  // Fetch available tags for filtering
  const { data: availableTags = [] } = useQuery({
    queryKey: ['drill-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drill_tags')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch drills
  const { data: drills = [], isLoading } = useQuery({
    queryKey: ['drills', searchTerm, selectedDifficulty, selectedTags],
    queryFn: async () => {
      let query = supabase
        .from('drills')
        .select(`
          *,
          drill_tags:drill_tag_assignments(
            tag:drill_tags(*)
          ),
          drill_media(*)
        `)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      if (selectedDifficulty && selectedDifficulty !== 'all') {
        query = query.eq('difficulty_level', selectedDifficulty);
      }

      const { data, error } = await query;
      if (error) throw error;

      let filteredData = data || [];

      // Filter by tags if any are selected
      if (selectedTags.length > 0) {
        filteredData = filteredData.filter(drill => {
          const drillTagIds = drill.drill_tags?.map((dt: any) => dt.tag?.id).filter(Boolean) || [];
          return selectedTags.every(tagId => drillTagIds.includes(tagId));
        });
      }

      // Transform the data to flatten drill_tags
      return filteredData.map(drill => ({
        ...drill,
        drill_tags: drill.drill_tags?.map((dt: any) => dt.tag).filter(Boolean) || [],
        drill_media: drill.drill_media || []
      }));
    },
  });

  // Delete drill mutation
  const deleteDrillMutation = useMutation({
    mutationFn: async (drillId: string) => {
      const { error } = await supabase
        .from('drills')
        .delete()
        .eq('id', drillId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Drill deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['drills'] });
    },
    onError: (error) => {
      toast.error('Failed to delete drill');
      console.error('Error deleting drill:', error);
    },
  });

  const handleDeleteDrill = (drillId: string) => {
    deleteDrillMutation.mutate(drillId);
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleClearTags = () => {
    setSelectedTags([]);
  };

  const selectedTagsData = availableTags.filter(tag => selectedTags.includes(tag.id));

  const getDifficultyColor = (difficulty: string | null) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search drills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Difficulties</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-48">
                <Tag className="w-4 h-4 mr-2" />
                Tags ({selectedTags.length})
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filter by Tags</h4>
                  {selectedTags.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearTags}
                      className="text-xs"
                    >
                      Clear All
                    </Button>
                  )}
                </div>
                
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableTags.map((tag) => (
                    <div key={tag.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={tag.id}
                        checked={selectedTags.includes(tag.id)}
                        onCheckedChange={() => handleTagToggle(tag.id)}
                      />
                      <label
                        htmlFor={tag.id}
                        className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </label>
                    </div>
                  ))}
                </div>
                
                {availableTags.length === 0 && (
                  <p className="text-sm text-muted-foreground">No tags available</p>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <Button onClick={() => setShowCreateDrill(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Drill
          </Button>
        </div>

        {/* Selected Tags Display */}
        {selectedTagsData.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-muted-foreground">Filtered by:</span>
            {selectedTagsData.map((tag) => (
              <Badge 
                key={tag.id}
                variant="secondary"
                className="cursor-pointer"
                style={{ backgroundColor: tag.color + '20', color: tag.color }}
                onClick={() => handleTagToggle(tag.id)}
              >
                {tag.name}
                <X className="w-3 h-3 ml-1" />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Drills List */}
      {drills.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Play className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No Drills Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || selectedDifficulty !== 'all' || selectedTags.length > 0
                ? 'No drills match your current filters.' 
                : 'Start building your drill library by creating your first drill.'
              }
            </p>
            <Button onClick={() => setShowCreateDrill(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Drill
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {drills.map((drill) => (
            <Card key={drill.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{drill.name}</CardTitle>
                    {drill.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {drill.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingDrill(drill)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Drill</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{drill.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteDrill(drill.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 items-center">
                  {drill.duration_minutes && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {drill.duration_minutes}min
                    </Badge>
                  )}
                  
                  {drill.difficulty_level && (
                    <Badge className={getDifficultyColor(drill.difficulty_level)}>
                      {drill.difficulty_level}
                    </Badge>
                  )}

                  {drill.is_public && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Public
                    </Badge>
                  )}

                  {drill.drill_media && drill.drill_media.length > 0 && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Paperclip className="w-3 h-3" />
                      {drill.drill_media.length} file{drill.drill_media.length > 1 ? 's' : ''}
                    </Badge>
                  )}

                  {drill.drill_tags?.map((tag) => (
                    <Badge 
                      key={tag.id} 
                      variant="secondary"
                      style={{ backgroundColor: tag.color + '20', color: tag.color }}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Drill Modal */}
      <DrillCreator 
        open={showCreateDrill} 
        onOpenChange={setShowCreateDrill}
      />

      {/* Edit Drill Modal */}
      {editingDrill && (
        <DrillEditModal
          drill={editingDrill}
          open={!!editingDrill}
          onOpenChange={(open) => !open && setEditingDrill(null)}
        />
      )}
    </div>
  );
}