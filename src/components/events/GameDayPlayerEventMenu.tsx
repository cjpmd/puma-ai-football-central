import React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MatchEventType, PlayerCardStatus } from '@/types/matchEvent';
import { Trophy, HandHeart, Shield, AlertCircle, AlertTriangle } from 'lucide-react';

interface GameDayPlayerEventMenuProps {
  playerId: string;
  playerName: string;
  isGoalkeeper: boolean;
  cardStatus: PlayerCardStatus;
  onEventSelect: (eventType: MatchEventType) => void;
  children: React.ReactNode;
}

export const GameDayPlayerEventMenu: React.FC<GameDayPlayerEventMenuProps> = ({
  playerId,
  playerName,
  isGoalkeeper,
  cardStatus,
  onEventSelect,
  children
}) => {
  const handleEventClick = (eventType: MatchEventType) => {
    onEventSelect(eventType);
  };

  const isCardDisabled = cardStatus.hasRed;
  const showSecondYellow = cardStatus.hasYellow && !cardStatus.hasRed;

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="center">
        <div className="space-y-1">
          <p className="text-sm font-semibold mb-2 px-2">{playerName}</p>
          
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 h-12"
            onClick={() => handleEventClick('goal')}
          >
            <Trophy className="h-5 w-5 text-green-500" />
            <span>Goal</span>
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start gap-2 h-12"
            onClick={() => handleEventClick('assist')}
          >
            <HandHeart className="h-5 w-5 text-blue-500" />
            <span>Assist</span>
          </Button>

          {isGoalkeeper && (
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 h-12"
              onClick={() => handleEventClick('save')}
            >
              <Shield className="h-5 w-5 text-purple-500" />
              <span>Save</span>
            </Button>
          )}

          <div className="border-t my-1" />

          {!isCardDisabled && (
            <>
              {showSecondYellow ? (
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 h-12 text-red-600"
                  onClick={() => handleEventClick('yellow_card')}
                >
                  <AlertTriangle className="h-5 w-5" />
                  <span>2nd Yellow (Red)</span>
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 h-12 text-yellow-600"
                  onClick={() => handleEventClick('yellow_card')}
                >
                  <AlertCircle className="h-5 w-5" />
                  <span>Yellow Card</span>
                </Button>
              )}

              <Button
                variant="ghost"
                className="w-full justify-start gap-2 h-12 text-red-600"
                onClick={() => handleEventClick('red_card')}
              >
                <AlertTriangle className="h-5 w-5" />
                <span>Red Card</span>
              </Button>
            </>
          )}

          {isCardDisabled && (
            <p className="text-xs text-muted-foreground px-2 py-2">
              Player has been sent off
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
