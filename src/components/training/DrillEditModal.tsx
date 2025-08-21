import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { DrillMediaManager } from './DrillMediaManager';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Drill {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  difficulty_level: string | null;
  is_public: boolean;
  drill_tags?: Array<{ id: string; name: string; color: string }>;
  drill_media?: Array<{ id: string; file_name: string; file_type: string; file_size: number | null; file_url: string }>;
}

interface DrillEditModalProps {
  drill: Drill;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DrillEditModal({ drill, open, onOpenChange }: DrillEditModalProps) {
  const [formData, setFormData] = useState({
    name: drill.name,
    description: drill.description || '',
    duration_minutes: drill.duration_minutes?.toString() || '',
    difficulty_level: drill.difficulty_level || '',
    is_public: drill.is_public,
  });
  const [selectedTags, setSelectedTags] = useState<string[]>(
    drill.drill_tags?.map(tag => tag.id) || []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();

  // Reset form when drill changes
  useEffect(() => {
    setFormData({
      name: drill.name,
      description: drill.description || '',
      duration_minutes: drill.duration_minutes?.toString() || '',
      difficulty_level: drill.difficulty_level || '',
      is_public: drill.is_public,
    });
    setSelectedTags(drill.drill_tags?.map(tag => tag.id) || []);
  }, [drill]);

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

  // Update drill mutation
  const updateDrillMutation = useMutation({
    mutationFn: async (updateData: typeof formData & { selectedTags: string[] }) => {
      const { selectedTags: tagIds, ...drillData } = updateData;
      
      // Update the drill
      const { error: drillError } = await supabase
        .from('drills')
        .update({
          ...drillData,
          duration_minutes: drillData.duration_minutes ? parseInt(drillData.duration_minutes) : null,
        })
        .eq('id', drill.id);

      if (drillError) throw drillError;

      // Delete existing tag assignments
      const { error: deleteTagsError } = await supabase
        .from('drill_tag_assignments')
        .delete()
        .eq('drill_id', drill.id);

      if (deleteTagsError) throw deleteTagsError;

      // Create new tag assignments
      if (tagIds.length > 0) {
        const tagAssignments = tagIds.map(tagId => ({
          drill_id: drill.id,
          tag_id: tagId,
        }));

        const { error: tagError } = await supabase
          .from('drill_tag_assignments')
          .insert(tagAssignments);

        if (tagError) throw tagError;
      }
    },
    onSuccess: () => {
      toast.success('Drill updated successfully');
      queryClient.invalidateQueries({ queryKey: ['drills'] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Failed to update drill');
      console.error('Error updating drill:', error);
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.name.trim()) {
      toast.error('Drill name is required');
      setIsSubmitting(false);
      return;
    }

    updateDrillMutation.mutate({
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
          <DialogTitle>Edit Drill</DialogTitle>
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

          <DrillMediaManager
            drillId={drill.id}
            existingMedia={drill.drill_media}
            disabled={isSubmitting}
          />

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
              {isSubmitting ? 'Updating...' : 'Update Drill'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}