import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Trophy, Target, Calendar, TrendingUp, TrendingDown, Minus, Clock } from 'lucide-react';
import type { ChildProgressData } from '@/services/childProgressService';

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

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={child.photo} alt={child.name} />
            <AvatarFallback className="text-lg font-semibold">
              {child.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-2xl">{child.name}</CardTitle>
            <div className="flex items-center gap-4 mt-1 text-muted-foreground">
              <span>Age {child.age}</span>
              {child.squadNumber && <span>#{child.squadNumber}</span>}
              {child.position && <span>{child.position}</span>}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">{child.teamName}</Badge>
              {child.clubName && <Badge variant="secondary">{child.clubName}</Badge>}
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-primary">{child.stats.totalGames}</div>
            <div className="text-sm text-muted-foreground">Games Played</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-primary">{Math.round(child.stats.totalMinutes)}</div>
            <div className="text-sm text-muted-foreground">Total Minutes</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-yellow-600">{child.stats.captainGames}</div>
            <div className="text-sm text-muted-foreground">Captain</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-green-600">{child.stats.playerOfTheMatchCount}</div>
            <div className="text-sm text-muted-foreground">POTM</div>
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

        {/* Quick Activity Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
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
      </CardContent>
    </Card>
  );
};