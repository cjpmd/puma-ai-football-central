import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { IndividualTrainingService } from '@/services/individualTrainingService';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, 
  Filter, 
  Tag, 
  Clock, 
  Users, 
  Plus,
  X,
  BookOpen,
  Play,
  Zap
} from 'lucide-react';

interface PlayerDrillLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToSession?: (drillId: string) => void;
  selectedDrills?: string[];
}

export function PlayerDrillLibrary({ 
  open, 
  onOpenChange, 
  onAddToSession,
  selectedDrills = []
}: PlayerDrillLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

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

  // Fetch available drills
  const { data: drills = [], isLoading } = useQuery({
    queryKey: ['player-drills', searchTerm, selectedDifficulty, selectedTags],
    queryFn: () => IndividualTrainingService.getAvailableDrills(searchTerm, selectedTags, selectedDifficulty),
    enabled: open,
  });

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

  const getIntensityIcon = (difficulty: string | null) => {
    const level = difficulty?.toLowerCase();
    if (level === 'beginner') return <Zap className="w-3 h-3" />;
    if (level === 'intermediate') return <><Zap className="w-3 h-3" /><Zap className="w-3 h-3" /></>;
    if (level === 'advanced') return <><Zap className="w-3 h-3" /><Zap className="w-3 h-3" /><Zap className="w-3 h-3" /></>;
    return <Zap className="w-3 h-3" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Drill Library
          </DialogTitle>
        </DialogHeader>

        {/* Search and Filters */}
        <div className="flex flex-col gap-4 pb-4 border-b">
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
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : drills.length === 0 ? (
            <div className="text-center py-12">
              <Play className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No Drills Found</h3>
              <p className="text-muted-foreground">
                {searchTerm || selectedDifficulty !== 'all' || selectedTags.length > 0
                  ? 'No drills match your current filters.' 
                  : 'No public drills are available.'
                }
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {drills.map((drill) => (
                <Card 
                  key={drill.id} 
                  className={`hover:shadow-md transition-all cursor-pointer ${
                    selectedDrills.includes(drill.id) ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {drill.name}
                          {selectedDrills.includes(drill.id) && (
                            <Badge variant="default" className="text-xs">
                              Added
                            </Badge>
                          )}
                        </CardTitle>
                        {drill.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {drill.description}
                          </p>
                        )}
                      </div>
                      {onAddToSession && (
                        <Button
                          variant={selectedDrills.includes(drill.id) ? "secondary" : "outline"}
                          size="sm"
                          onClick={() => onAddToSession(drill.id)}
                          disabled={selectedDrills.includes(drill.id)}
                          className="ml-4"
                        >
                          {selectedDrills.includes(drill.id) ? (
                            'Added'
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-1" />
                              Add
                            </>
                          )}
                        </Button>
                      )}
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
                          <div className="flex items-center gap-1">
                            {getIntensityIcon(drill.difficulty_level)}
                            {drill.difficulty_level}
                          </div>
                        </Badge>
                      )}

                      {drill.is_public && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          Public
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
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}