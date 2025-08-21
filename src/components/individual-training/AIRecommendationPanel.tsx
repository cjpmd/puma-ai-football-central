import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Brain, Lightbulb, Target, TrendingUp, Sparkles, CheckCircle, X } from 'lucide-react';
import { IndividualTrainingService } from '@/services/individualTrainingService';
import { toast } from 'sonner';
import type { AITrainingRecommendation, DrillWithTags } from '@/types/individualTraining';

interface AIRecommendationPanelProps {
  playerId: string;
  onRecommendationApplied?: (recommendation: AITrainingRecommendation) => void;
}

export const AIRecommendationPanel: React.FC<AIRecommendationPanelProps> = ({
  playerId,
  onRecommendationApplied
}) => {
  const [recommendations, setRecommendations] = useState<AITrainingRecommendation[]>([]);
  const [recommendedDrills, setRecommendedDrills] = useState<Record<string, DrillWithTags[]>>({});
  const [loading, setLoading] = useState(true);
  const [generatingRecommendations, setGeneratingRecommendations] = useState(false);

  useEffect(() => {
    loadRecommendations();
  }, [playerId]);

  const loadRecommendations = async () => {
    try {
      const data = await IndividualTrainingService.getPlayerRecommendationsAI(playerId);
      setRecommendations(data);
      
      // Load drill details for each recommendation
      const drillMap: Record<string, DrillWithTags[]> = {};
      for (const recommendation of data) {
        if (recommendation.recommended_drills.length > 0) {
          try {
            const drills = await IndividualTrainingService.getAvailableDrills();
            const filteredDrills = drills.filter(drill => 
              recommendation.recommended_drills.includes(drill.id)
            );
            drillMap[recommendation.id] = filteredDrills;
          } catch (error) {
            console.error('Error loading drills for recommendation:', error);
          }
        }
      }
      setRecommendedDrills(drillMap);
    } catch (error) {
      console.error('Error loading recommendations:', error);
      toast.error('Failed to load AI recommendations');
    } finally {
      setLoading(false);
    }
  };

  const generateNewRecommendations = async () => {
    setGeneratingRecommendations(true);
    try {
      // This would typically call an AI service
      // For now, we'll create a mock recommendation
      const mockRecommendation = await IndividualTrainingService.createAIRecommendation(playerId, {
        focus_areas: ['ball_control', 'agility'],
        difficulty_level: 3,
        recommended_drills: [],
        reasoning: 'Based on recent performance analysis, focusing on ball control and agility would help improve overall game performance.',
        confidence_score: 0.85
      });
      
      toast.success('New AI recommendations generated');
      loadRecommendations();
    } catch (error) {
      console.error('Error generating recommendations:', error);
      toast.error('Failed to generate recommendations');
    } finally {
      setGeneratingRecommendations(false);
    }
  };

  const handleApplyRecommendation = async (recommendation: AITrainingRecommendation) => {
    try {
      await IndividualTrainingService.updateRecommendationStatus(recommendation.id, 'applied');
      toast.success('Recommendation applied to your training plan');
      loadRecommendations();
      onRecommendationApplied?.(recommendation);
    } catch (error) {
      console.error('Error applying recommendation:', error);
      toast.error('Failed to apply recommendation');
    }
  };

  const handleDismissRecommendation = async (recommendation: AITrainingRecommendation) => {
    try {
      await IndividualTrainingService.updateRecommendationStatus(recommendation.id, 'dismissed');
      toast.success('Recommendation dismissed');
      loadRecommendations();
    } catch (error) {
      console.error('Error dismissing recommendation:', error);
      toast.error('Failed to dismiss recommendation');
    }
  };

  const getDifficultyColor = (level: number) => {
    if (level <= 2) return 'bg-green-500';
    if (level <= 3) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getDifficultyLabel = (level: number) => {
    if (level <= 2) return 'Beginner';
    if (level <= 3) return 'Intermediate';
    return 'Advanced';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            AI Training Recommendations
          </CardTitle>
          
          <Button
            variant="outline"
            size="sm"
            onClick={generateNewRecommendations}
            disabled={generatingRecommendations}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {generatingRecommendations ? 'Generating...' : 'Generate New'}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {recommendations.length === 0 ? (
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertDescription>
              No AI recommendations available yet. Generate personalized training recommendations based on your performance data.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            {recommendations.map((recommendation) => (
              <div key={recommendation.id} className="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-blue-50">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-600" />
                    <div>
                      <div className="font-medium">AI Training Recommendation</div>
                      <div className="text-sm text-muted-foreground">
                        Generated {new Date(recommendation.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  {recommendation.confidence_score && (
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Confidence</div>
                      <div className="flex items-center gap-2">
                        <Progress value={recommendation.confidence_score * 100} className="w-16 h-2" />
                        <span className="text-sm font-medium">
                          {Math.round(recommendation.confidence_score * 100)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Focus Areas */}
                <div className="mb-4">
                  <div className="text-sm font-medium mb-2">Focus Areas:</div>
                  <div className="flex flex-wrap gap-2">
                    {recommendation.focus_areas.map((area, index) => (
                      <Badge key={index} variant="secondary" className="bg-purple-100 text-purple-700">
                        {area.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {/* Difficulty Level */}
                <div className="mb-4">
                  <div className="text-sm font-medium mb-2">Difficulty Level:</div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getDifficultyColor(recommendation.difficulty_level)}`}></div>
                    <span className="text-sm">{getDifficultyLabel(recommendation.difficulty_level)}</span>
                    <span className="text-xs text-muted-foreground">({recommendation.difficulty_level}/5)</span>
                  </div>
                </div>
                
                {/* Reasoning */}
                {recommendation.reasoning && (
                  <div className="mb-4 p-3 bg-white/60 rounded-md">
                    <div className="text-sm font-medium mb-1">AI Analysis:</div>
                    <div className="text-sm text-muted-foreground">{recommendation.reasoning}</div>
                  </div>
                )}
                
                {/* Recommended Drills */}
                {recommendedDrills[recommendation.id] && recommendedDrills[recommendation.id].length > 0 && (
                  <div className="mb-4">
                    <div className="text-sm font-medium mb-2">Recommended Drills:</div>
                    <div className="space-y-2">
                      {recommendedDrills[recommendation.id].map((drill) => (
                        <div key={drill.id} className="flex items-center gap-2 p-2 bg-white/60 rounded">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <span className="text-sm">{drill.name}</span>
                          {drill.duration_minutes && (
                            <Badge variant="outline" className="text-xs">
                              {drill.duration_minutes}min
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => handleApplyRecommendation(recommendation)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Apply to Plan
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDismissRecommendation(recommendation)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Dismiss
                  </Button>
                </div>
                
                {/* Expiry Warning */}
                {new Date(recommendation.expires_at) < new Date(Date.now() + 24 * 60 * 60 * 1000) && (
                  <Alert className="mt-3 border-orange-200 bg-orange-50">
                    <AlertDescription className="text-orange-800">
                      This recommendation expires soon. Apply it before {new Date(recommendation.expires_at).toLocaleDateString()}.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};