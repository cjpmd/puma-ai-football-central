
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatabaseEvent } from '@/types/event';

interface ScoreInputProps {
  event: DatabaseEvent;
  onScoreUpdate: (eventId: string, scores: { home: number; away: number }) => void;
}

export const ScoreInput: React.FC<ScoreInputProps> = ({ event, onScoreUpdate }) => {
  const [homeScore, setHomeScore] = useState(event.scores?.home?.toString() || '0');
  const [awayScore, setAwayScore] = useState(event.scores?.away?.toString() || '0');

  const handleSave = () => {
    const scores = {
      home: parseInt(homeScore) || 0,
      away: parseInt(awayScore) || 0
    };
    onScoreUpdate(event.id, scores);
  };

  const getOutcomeIcon = () => {
    const home = parseInt(homeScore) || 0;
    const away = parseInt(awayScore) || 0;
    const ourScore = event.is_home ? home : away;
    const theirScore = event.is_home ? away : home;
    
    if (ourScore > theirScore) return { icon: '🏆', text: 'Win', color: 'text-green-600' };
    if (ourScore < theirScore) return { icon: '❌', text: 'Loss', color: 'text-red-600' };
    return { icon: '🤝', text: 'Draw', color: 'text-yellow-600' };
  };

  const outcome = getOutcomeIcon();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Match Score
          <span className={`text-2xl ${outcome.color}`}>
            {outcome.icon}
          </span>
          <span className={`text-sm ${outcome.color}`}>
            {outcome.text}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 items-center">
          <div className="space-y-2">
            <Label htmlFor="homeScore">
              Home {event.is_home ? '(Us)' : ''}
            </Label>
            <Input
              id="homeScore"
              type="number"
              min="0"
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value)}
              className="text-center text-lg font-bold"
            />
          </div>
          
          <div className="text-center text-2xl font-bold text-muted-foreground">
            VS
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="awayScore">
              Away {!event.is_home ? '(Us)' : ''}
            </Label>
            <Input
              id="awayScore"
              type="number"
              min="0"
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value)}
              className="text-center text-lg font-bold"
            />
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Our Score: <span className="font-bold">{event.is_home ? homeScore : awayScore}</span> - 
            Their Score: <span className="font-bold">{event.is_home ? awayScore : homeScore}</span>
          </p>
          
          {event.opponent && (
            <p className="text-sm text-muted-foreground">
              vs {event.opponent}
            </p>
          )}
        </div>

        <Button onClick={handleSave} className="w-full">
          Save Score
        </Button>
      </CardContent>
    </Card>
  );
};
