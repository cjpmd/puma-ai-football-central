import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Trophy, Target, Calendar, TrendingUp, TrendingDown, Minus, Clock, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ChildProgressData } from '@/services/childProgressService';
import { playStylesService } from '@/types/playStyles';

interface ChildSummaryCardProps {
  child: ChildProgressData;
}

export const ChildSummaryCard: React.FC<ChildSummaryCardProps> = ({ child }) => {
  const getTrendIcon = () => {
    switch (child.performanceTrend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'needs-work':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-blue-500" />;
    }
  };

  const getTrendColor = () => {
    switch (child.performanceTrend) {
      case 'improving':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'needs-work':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  // Get top positions played
  const getTopPositions = () => {
    // Get minutesByPosition from match_stats if available
    const matchStats = child.matchHistory?.[0]?.minutesByPosition || {};
    
    // Aggregate from all match history
    const positionTotals: { [key: string]: number } = {};
    child.matchHistory?.forEach((match: any) => {
      if (match.minutesByPosition) {
        Object.entries(match.minutesByPosition).forEach(([position, minutes]) => {
          positionTotals[position] = (positionTotals[position] || 0) + (minutes as number);
        });
      }
    });

    // Sort by minutes and get top 3
    return Object.entries(positionTotals)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([position, minutes]) => ({ position, minutes: minutes as number }));
  };

  const topPositions = getTopPositions();

  // Load play style icons
  const [playStyleIcons, setPlayStyleIcons] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!child.position) return;
    
    playStylesService.getAllPlayStyles().then(allPlayStyles => {
      const playerStyleTexts = child.position!.split(',').map(s => s.trim());
      const icons = playerStyleTexts
        .map(styleText => {
          const style = allPlayStyles.find(s => s.label.toLowerCase() === styleText.toLowerCase());
          return style?.icon_emoji || '';
        })
        .filter(Boolean);
      setPlayStyleIcons(icons);
    });
  }, [child.position]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Avatar className="h-16 w-16 flex-shrink-0">
            <AvatarImage src={child.photo} alt={child.name} />
            <AvatarFallback className="text-lg font-semibold">
              {child.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 w-full sm:w-auto">
            <CardTitle className="text-xl sm:text-2xl">{child.name}</CardTitle>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 text-sm sm:text-base text-muted-foreground">
              <span>Age {child.age}</span>
              {child.squadNumber && <span>#{child.squadNumber}</span>}
              {playStyleIcons && playStyleIcons.length > 0 && (
                <span className="text-base sm:text-lg">{playStyleIcons.join(' ')}</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs sm:text-sm">{child.teamName}</Badge>
              {child.clubName && <Badge variant="secondary" className="text-xs sm:text-sm">{child.clubName}</Badge>}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Performance Trend */}
        <div className={`flex items-center justify-between p-3 rounded-lg border ${getTrendColor()}`}>
          <div className="flex items-center gap-2">
            {getTrendIcon()}
            <span className="font-medium">Performance Trend</span>
          </div>
          <Badge variant="outline" className="border-current">
            {child.performanceTrend === 'improving' && 'Improving'}
            {child.performanceTrend === 'needs-work' && 'Needs Work'}
            {child.performanceTrend === 'maintaining' && 'Maintaining'}
          </Badge>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-primary">{child.stats.totalGames}</div>
            <div className="text-xs text-muted-foreground">Games</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-primary">{Math.round(child.stats.totalMinutes)}</div>
            <div className="text-xs text-muted-foreground">Minutes</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-primary">{child.stats.totalGoals || 0}</div>
            <div className="text-xs text-muted-foreground">⚽ Goals</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-primary">{child.stats.totalAssists || 0}</div>
            <div className="text-xs text-muted-foreground">👟 Assists</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-primary">{child.stats.totalSaves || 0}</div>
            <div className="text-xs text-muted-foreground">🧤 Saves</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-yellow-600">{child.stats.captainGames}</div>
            <div className="text-xs text-muted-foreground">Captain</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-green-600">{child.stats.playerOfTheMatchCount}</div>
            <div className="text-xs text-muted-foreground">POTM</div>
          </div>
        </div>

        {/* Training Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              <span className="font-medium">Training Completion</span>
            </div>
            <span className="text-sm text-muted-foreground">{child.stats.trainingCompletionRate}%</span>
          </div>
          <Progress value={child.stats.trainingCompletionRate} className="h-2" />
        </div>

        {/* Top Positions Played */}
        {topPositions.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Top Positions</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {topPositions.map(({ position, minutes }) => (
                <Badge key={position} variant="secondary" className="text-xs">
                  {position}: {Math.round(minutes)}min
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Quick Activity Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
          {child.stats.lastMatchDate && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Last match:</span>
              <span className="font-medium">{child.stats.lastMatchDate}</span>
            </div>
          )}
          {child.stats.nextMatchDate && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Next match:</span>
              <span className="font-medium">{child.stats.nextMatchDate}</span>
            </div>
          )}
        </div>

        {/* Single FIFA Card Action */}
        <div className="pt-4 border-t">
          <Button
            asChild
            variant="outline"
            className="w-full gap-2"
          >
            <Link to="/players">
              <CreditCard className="h-4 w-4" />
              View Player Cards
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};