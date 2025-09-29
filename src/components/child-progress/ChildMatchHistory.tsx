import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Shield, Clock, MapPin } from 'lucide-react';
import type { ChildProgressData } from '@/services/childProgressService';

interface ChildMatchHistoryProps {
  child: ChildProgressData;
}

export const ChildMatchHistory: React.FC<ChildMatchHistoryProps> = ({ child }) => {
  if (!child.matchHistory || child.matchHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Match History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No match history available yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Match History</h2>
      
      <div className="space-y-3">
        {child.matchHistory.map((match, index) => (
          <Card key={index} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{match.opponent || 'Unknown Opponent'}</h3>
                    {match.captain && (
                      <Badge variant="outline" className="text-xs">
                        <Shield className="h-3 w-3 mr-1" />
                        Captain
                      </Badge>
                    )}
                    {match.playerOfTheMatch && (
                      <Badge variant="default" className="text-xs bg-yellow-500 hover:bg-yellow-600">
                        <Trophy className="h-3 w-3 mr-1" />
                        POTM
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{match.date}</span>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{match.minutes} min</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  {match.performanceCategory && (
                    <Badge variant="secondary" className="text-xs mb-1">
                      {match.performanceCategory}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Positions played */}
              {match.minutesByPosition && Object.keys(match.minutesByPosition).length > 0 && (
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Positions:</span>
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(match.minutesByPosition).map(([position, minutes]) => (
                        <Badge key={position} variant="outline" className="text-xs">
                          {position} ({String(minutes)}min)
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Substitute indicator */}
              {match.wasSubstitute && (
                <div className="mt-2">
                  <Badge variant="secondary" className="text-xs">
                    Substitute
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Season Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{child.stats.totalGames}</div>
              <div className="text-sm text-muted-foreground">Games</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{Math.round(child.stats.totalMinutes)}</div>
              <div className="text-sm text-muted-foreground">Minutes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{child.stats.captainGames}</div>
              <div className="text-sm text-muted-foreground">Captain</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{child.stats.playerOfTheMatchCount}</div>
              <div className="text-sm text-muted-foreground">POTM Awards</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};