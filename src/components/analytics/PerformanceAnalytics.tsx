import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Target } from 'lucide-react';

interface PerformanceAnalyticsProps {
  teamId: string;
  data?: {
    improvingAreas: string[];
    persistentChallenges: string[];
    recentPositives: string[];
    recentGamesCount: number;
  };
}

export const PerformanceAnalytics: React.FC<PerformanceAnalyticsProps> = ({ 
  teamId, 
  data 
}) => {
  if (!data) {
    return null;
  }

  const { improvingAreas, persistentChallenges, recentPositives, recentGamesCount } = data;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Improving Areas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Improving Areas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {improvingAreas.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {improvingAreas.map((area, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary" 
                    className="text-xs bg-green-100 text-green-800 border-green-200"
                  >
                    {area}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No improvement trends yet</p>
            )}
          </CardContent>
        </Card>

        {/* Persistent Challenges */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-orange-600" />
              Focus Areas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {persistentChallenges.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {persistentChallenges.map((challenge, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary" 
                    className="text-xs bg-orange-100 text-orange-800 border-orange-200"
                  >
                    {challenge}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No recurring challenges</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Positives */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Team Strengths
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {recentPositives.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {recentPositives.map((positive, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary" 
                    className="text-xs bg-blue-100 text-blue-800 border-blue-200"
                  >
                    {positive}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No recent positives recorded</p>
            )}
          </CardContent>
        </Card>
      </div>

      {recentGamesCount > 0 && (
        <div className="text-xs text-muted-foreground text-center">
          Analysis based on {recentGamesCount} recent game{recentGamesCount > 1 ? 's' : ''} with performance data
        </div>
      )}
    </div>
  );
};