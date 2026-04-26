import { logger } from '@/lib/logger';
import { useState } from 'react';
import { useClubContext } from '@/contexts/ClubContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DrillCreator } from './DrillCreator';
import { DrillEditModal } from './DrillEditModal';
import { DrillMediaManager } from './DrillMediaManager';
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
  Tag,
  ExternalLink,
  ChevronRight,
  User,
  Link,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const AGE_GROUPS = [
  'All Ages', 'U6', 'U7', 'U8', 'U9', 'U10', 'U11', 'U12',
  'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U21', 'Senior',
];

interface Drill {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  difficulty_level: string | null;
  age_group: string | null;
  external_url: string | null;
  is_public: boolean;
  created_by: string;
  created_at: string;
  drill_tags?: Array<{ id: string; name: string; color: string }>;
  drill_media?: Array<{ id: string; file_name: string; file_type: string; file_size: number | null; file_url: string }>;
}

interface DrillLibraryManagerProps {
  onAddToPlan?: (drill: Drill) => void;
}

export function DrillLibraryManager({ onAddToPlan }: DrillLibraryManagerProps = {}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showCreateDrill, setShowCreateDrill] = useState(false);
  const [editingDrill, setEditingDrill] = useState<Drill | null>(null);
  const [detailDrill, setDetailDrill] = useState<Drill | null>(null);

  const queryClient = useQueryClient();
  const { currentClub } = useClubContext();

  const { data: availableTags = [] } = useQuery({
    queryKey: ['drill-tags'],
    queryFn: async () => {
      const { data, error } = await supabase.from('drill_tags').select('*').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: drills = [], isLoading } = useQuery({
    queryKey: ['drills', searchTerm, selectedDifficulty, selectedAgeGroup, selectedTags, currentClub?.id],
    queryFn: async () => {
      let query = supabase
        .from('drills')
        .select(`*, drill_tags:drill_tag_assignments(tag:drill_tags(*)), drill_media(*)`)
        .order('created_at', { ascending: false });

      // Scope to club's drills and globally-public drills (club_id IS NULL + is_public)
      if (currentClub?.id) {
        query = query.or(`club_id.eq.${currentClub.id},and(is_public.eq.true,club_id.is.null)`);
      }

      if (searchTerm) query = query.ilike('name', `%${searchTerm}%`);
      if (selectedDifficulty && selectedDifficulty !== 'all') query = query.eq('difficulty_level', selectedDifficulty);
      if (selectedAgeGroup && selectedAgeGroup !== 'all') query = query.eq('age_group', selectedAgeGroup);

      const { data, error } = await query;
      if (error) throw error;

      let filteredData = data || [];

      if (selectedTags.length > 0) {
        filteredData = filteredData.filter(drill => {
          const drillTagIds = drill.drill_tags?.map((dt: any) => dt.tag?.id).filter(Boolean) || [];
          return selectedTags.every(tagId => drillTagIds.includes(tagId));
        });
      }

      return filteredData.map(drill => ({
        ...drill,
        drill_tags: drill.drill_tags?.map((dt: any) => dt.tag).filter(Boolean) || [],
        drill_media: drill.drill_media || [],
      }));
    },
  });

  const deleteDrillMutation = useMutation({
    mutationFn: async (drillId: string) => {
      const { error } = await supabase.from('drills').delete().eq('id', drillId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Drill deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['drills'] });
      if (detailDrill) setDetailDrill(null);
    },
    onError: (error) => {
      toast.error('Failed to delete drill');
      logger.error('Error deleting drill:', error);
    },
  });

  const handleTagToggle = (tagId: string) => {
    setSelectedTags(prev => prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]);
  };

  const handleClearTags = () => setSelectedTags([]);
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
        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search drills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
            <SelectTrigger className="w-full sm:w-44">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Difficulties</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedAgeGroup} onValueChange={setSelectedAgeGroup}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Age Group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ages</SelectItem>
              {AGE_GROUPS.map(ag => <SelectItem key={ag} value={ag}>{ag}</SelectItem>)}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-36">
                <Tag className="w-4 h-4 mr-2" />
                Tags ({selectedTags.length})
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filter by Tags</h4>
                  {selectedTags.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={handleClearTags} className="text-xs">Clear All</Button>
                  )}
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableTags.map((tag) => (
                    <div key={tag.id} className="flex items-center space-x-2">
                      <Checkbox id={tag.id} checked={selectedTags.includes(tag.id)} onCheckedChange={() => handleTagToggle(tag.id)} />
                      <label htmlFor={tag.id} className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                        {tag.name}
                      </label>
                    </div>
                  ))}
                </div>
                {availableTags.length === 0 && <p className="text-sm text-muted-foreground">No tags available</p>}
              </div>
            </PopoverContent>
          </Popover>

          <Button onClick={() => setShowCreateDrill(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Drill
          </Button>
        </div>

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
              {searchTerm || selectedDifficulty !== 'all' || selectedAgeGroup !== 'all' || selectedTags.length > 0
                ? 'No drills match your current filters.'
                : 'Start building your drill library by creating your first drill.'}
            </p>
            <Button onClick={() => setShowCreateDrill(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Drill
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {drills.map((drill) => (
            <Card
              key={drill.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setDetailDrill(drill)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{drill.name}</h3>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                    {drill.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{drill.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {drill.duration_minutes && (
                        <Badge variant="outline" className="flex items-center gap-1 text-xs">
                          <Clock className="w-3 h-3" />{drill.duration_minutes}min
                        </Badge>
                      )}
                      {drill.difficulty_level && (
                        <Badge className={`text-xs ${getDifficultyColor(drill.difficulty_level)}`}>
                          {drill.difficulty_level}
                        </Badge>
                      )}
                      {drill.age_group && (
                        <Badge variant="outline" className="text-xs">
                          <Users className="w-3 h-3 mr-1" />{drill.age_group}
                        </Badge>
                      )}
                      {drill.external_url && (
                        <Badge variant="outline" className="text-xs">
                          <Link className="w-3 h-3 mr-1" />URL
                        </Badge>
                      )}
                      {drill.drill_media && drill.drill_media.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          <Paperclip className="w-3 h-3 mr-1" />{drill.drill_media.length} file{drill.drill_media.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                      {drill.drill_tags?.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="secondary"
                          className="text-xs"
                          style={{ backgroundColor: tag.color + '20', color: tag.color }}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {onAddToPlan && (
                      <Button size="sm" onClick={() => onAddToPlan(drill)}>
                        Add
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setEditingDrill(drill)}>
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
                            onClick={() => deleteDrillMutation.mutate(drill.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Drill Detail Sheet */}
      <Sheet open={!!detailDrill} onOpenChange={(open) => !open && setDetailDrill(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {detailDrill && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle>{detailDrill.name}</SheetTitle>
              </SheetHeader>

              <div className="space-y-5">
                {/* Meta badges */}
                <div className="flex flex-wrap gap-2">
                  {detailDrill.duration_minutes && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />{detailDrill.duration_minutes} min
                    </Badge>
                  )}
                  {detailDrill.difficulty_level && (
                    <Badge className={getDifficultyColor(detailDrill.difficulty_level)}>
                      {detailDrill.difficulty_level}
                    </Badge>
                  )}
                  {detailDrill.age_group && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Users className="w-3 h-3" />{detailDrill.age_group}
                    </Badge>
                  )}
                  {detailDrill.is_public && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <User className="w-3 h-3" />Public
                    </Badge>
                  )}
                </div>

                {/* Tags */}
                {detailDrill.drill_tags && detailDrill.drill_tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {detailDrill.drill_tags.map(tag => (
                      <Badge
                        key={tag.id}
                        variant="secondary"
                        style={{ backgroundColor: tag.color + '20', color: tag.color }}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Description */}
                {detailDrill.description && (
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{detailDrill.description}</p>
                  </div>
                )}

                {/* External URL */}
                {detailDrill.external_url && (
                  <div>
                    <h4 className="font-medium mb-2">External Resource</h4>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={() => window.open(detailDrill.external_url!, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span className="truncate">{detailDrill.external_url}</span>
                    </Button>
                  </div>
                )}

                {/* Media */}
                {detailDrill.drill_media && detailDrill.drill_media.length > 0 && (
                  <div>
                    <DrillMediaManager
                      drillId={detailDrill.id}
                      existingMedia={detailDrill.drill_media}
                      readOnly
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2 border-t">
                  {onAddToPlan && (
                    <Button
                      className="flex-1"
                      onClick={() => {
                        onAddToPlan(detailDrill);
                        setDetailDrill(null);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add to Plan
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingDrill(detailDrill);
                      setDetailDrill(null);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Drill</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{detailDrill.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteDrillMutation.mutate(detailDrill.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <DrillCreator open={showCreateDrill} onOpenChange={setShowCreateDrill} />

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
