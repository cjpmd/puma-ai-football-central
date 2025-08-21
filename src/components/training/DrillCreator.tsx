import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DrillCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DrillTag {
  id: string;
  name: string;
  color: string;
}

export function DrillCreator({ open, onOpenChange }: DrillCreatorProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration_minutes: '',
    difficulty_level: '',
    is_public: false,
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();

  // Fetch available tags
  const { data: tags = [] } = useQuery({
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

  // Create drill mutation
  const createDrillMutation = useMutation({
    mutationFn: async (drillData: typeof formData & { selectedTags: string[] }) => {
      const { selectedTags: tagIds, ...drill } = drillData;
      
      // Create the drill
      const { data: newDrill, error: drillError } = await supabase
        .from('drills')
        .insert({
          ...drill,
          duration_minutes: drill.duration_minutes ? parseInt(drill.duration_minutes) : null,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (drillError) throw drillError;

      // Create tag assignments
      if (tagIds.length > 0) {
        const tagAssignments = tagIds.map(tagId => ({
          drill_id: newDrill.id,
          tag_id: tagId,
        }));

        const { error: tagError } = await supabase
          .from('drill_tag_assignments')
          .insert(tagAssignments);

        if (tagError) throw tagError;
      }

      return newDrill;
    },
    onSuccess: () => {
      toast.success('Drill created successfully');
      queryClient.invalidateQueries({ queryKey: ['drills'] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to create drill');
      console.error('Error creating drill:', error);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      duration_minutes: '',
      difficulty_level: '',
      is_public: false,
    });
    setSelectedTags([]);
    setIsSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.name.trim()) {
      toast.error('Drill name is required');
      setIsSubmitting(false);
      return;
    }

    createDrillMutation.mutate({
      ...formData,
      selectedTags,
    });
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const selectedTagsData = tags.filter(tag => selectedTags.includes(tag.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Drill</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Drill Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter drill name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the drill, objectives, and instructions"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="120"
                value={formData.duration_minutes}
                onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: e.target.value }))}
                placeholder="15"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty Level</Label>
              <Select 
                value={formData.difficulty_level} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty_level: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mb-2">
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
            <Select onValueChange={handleTagToggle}>
              <SelectTrigger>
                <SelectValue placeholder="Add tags" />
              </SelectTrigger>
              <SelectContent>
                {tags
                  .filter(tag => !selectedTags.includes(tag.id))
                  .map((tag) => (
                    <SelectItem key={tag.id} value={tag.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="public"
              checked={formData.is_public}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked }))}
            />
            <Label htmlFor="public">Make this drill public (visible to other coaches)</Label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Drill'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}