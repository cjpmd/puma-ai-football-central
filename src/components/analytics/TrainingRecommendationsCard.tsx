import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Target, Clock } from 'lucide-react';

interface RecommendedDrill {
  id: string;
  name: string;
  description: string;
  difficulty_level: string;
  duration_minutes: number;
  tags: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  relevanceScore: number;
  matchingChallenges: string[];
}

interface TrainingRecommendationsCardProps {
  recommendations: RecommendedDrill[];
  onCreateTrainingSession?: () => void;
  loading?: boolean;
}

export const TrainingRecommendationsCard: React.FC<TrainingRecommendationsCardProps> = ({
  recommendations,
  onCreateTrainingSession,
  loading = false
}) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Recommended Training
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Recommended Training
          {recommendations.length > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {recommendations.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {recommendations.length > 0 ? (
          <div className="space-y-3">
            {recommendations.slice(0, 3).map((drill) => (
              <div 
                key={drill.id} 
                className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-medium">{drill.name}</h4>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {drill.duration_minutes}min
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                  {drill.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {drill.matchingChallenges.slice(0, 2).map((challenge, index) => (
                      <Badge 
                        key={index}
                        variant="outline" 
                        className="text-xs h-5 px-1.5"
                      >
                        {challenge}
                      </Badge>
                    ))}
                    {drill.matchingChallenges.length > 2 && (
                      <Badge variant="outline" className="text-xs h-5 px-1.5">
                        +{drill.matchingChallenges.length - 2}
                      </Badge>
                    )}
                  </div>
                  
                  <Badge 
                    variant="secondary" 
                    className="text-xs capitalize"
                  >
                    {drill.difficulty_level}
                  </Badge>
                </div>
              </div>
            ))}
            
            {recommendations.length > 3 && (
              <div className="text-center pt-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs"
                  onClick={onCreateTrainingSession}
                >
                  View all {recommendations.length} recommendations
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            )}
            
            {onCreateTrainingSession && (
              <Button 
                className="w-full text-xs h-8" 
                onClick={onCreateTrainingSession}
              >
                Create Training Session
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-1">No recommendations yet</p>
            <p className="text-xs text-muted-foreground">
              Complete post-game reports to get drill recommendations
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};