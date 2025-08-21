import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Lightbulb, Clock, Target, RefreshCw } from 'lucide-react';
import { trainingRecommendationService } from '@/services/trainingRecommendationService';
import { toast } from 'sonner';

interface Drill {
  id: string;
  name: string;
  description?: string;
  duration_minutes?: number;
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  tags?: DrillTag[];
}

interface DrillTag {
  id: string;
  name: string;
  color: string;
}

interface RecommendedDrill {
  drill: Drill;
  score: number;
  matchedTags: string[];
  reasons: string[];
}

interface RecommendedDrillsPanelProps {
  teamId: string;
  onAddDrill: (drill: Drill) => void;
  className?: string;
}

export function RecommendedDrillsPanel({ 
  teamId, 
  onAddDrill, 
  className = '' 
}: RecommendedDrillsPanelProps) {
  const [usePlayerObjectives, setUsePlayerObjectives] = useState(true);
  const [useRecentNotes, setUseRecentNotes] = useState(true);
  const [avoidRepeats, setAvoidRepeats] = useState(true);

  const { 
    data: recommendations = [], 
    isLoading, 
    refetch 
  } = useQuery({
    queryKey: [
      'drill-recommendations', 
      teamId, 
      usePlayerObjectives, 
      useRecentNotes, 
      avoidRepeats
    ],
    queryFn: () => trainingRecommendationService.getRecommendations(teamId, {
      usePlayerObjectives,
      useRecentNotes,
      avoidRepeats,
      maxResults: 8
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!teamId
  });

  const handleAddDrill = (drill: Drill) => {
    onAddDrill(drill);
    toast.success(`Added "${drill.name}" to training plan`);
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'advanced': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="w-5 h-5" />
            Recommended Drills
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="w-5 h-5" />
            Recommended Drills
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Controls */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="objectives" className="text-sm font-normal">
              Player Objectives
            </Label>
            <Switch
              id="objectives"
              checked={usePlayerObjectives}
              onCheckedChange={setUsePlayerObjectives}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="notes" className="text-sm font-normal">
              Recent Notes
            </Label>
            <Switch
              id="notes"
              checked={useRecentNotes}
              onCheckedChange={setUseRecentNotes}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="repeats" className="text-sm font-normal">
              Avoid Repeats
            </Label>
            <Switch
              id="repeats"
              checked={avoidRepeats}
              onCheckedChange={setAvoidRepeats}
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {recommendations.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {!usePlayerObjectives && !useRecentNotes 
                ? 'Enable some options above to get recommendations'
                : 'No recommendations available. Try adjusting your settings or add more player objectives and event notes.'
              }
            </p>
          </div>
        ) : (
          recommendations.map((recommendation, index) => (
            <Card 
              key={recommendation.drill.id}
              className="relative hover:shadow-md transition-all duration-200 border-l-4"
              style={{
                borderLeftColor: recommendation.drill.tags?.[0]?.color || '#94a3b8'
              }}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm leading-tight truncate">
                        {recommendation.drill.name}
                      </h4>
                      {recommendation.score >= 6 && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0">
                          ⭐ Top Pick
                        </Badge>
                      )}
                    </div>
                    
                    {/* Metadata */}
                    <div className="flex items-center gap-2 mb-2">
                      {recommendation.drill.duration_minutes && (
                        <Badge variant="outline" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {recommendation.drill.duration_minutes}m
                        </Badge>
                      )}
                      {recommendation.drill.difficulty_level && (
                        <Badge className={`text-xs ${getDifficultyColor(recommendation.drill.difficulty_level)}`}>
                          {recommendation.drill.difficulty_level}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Tags */}
                    {recommendation.drill.tags && recommendation.drill.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {recommendation.drill.tags.slice(0, 2).map((tag) => (
                          <Badge 
                            key={tag.id}
                            variant="secondary" 
                            className="text-xs px-1.5 py-0"
                            style={{ 
                              backgroundColor: `${tag.color}20`, 
                              color: tag.color,
                              borderColor: `${tag.color}40`
                            }}
                          >
                            {tag.name}
                          </Badge>
                        ))}
                        {recommendation.drill.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                            +{recommendation.drill.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    {/* Reasons */}
                    {recommendation.reasons.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Why: </span>
                        {recommendation.reasons.slice(0, 2).join('; ')}
                        {recommendation.reasons.length > 2 && '...'}
                      </div>
                    )}
                  </div>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddDrill(recommendation.drill)}
                    className="shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
}