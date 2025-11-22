import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MatchEventType, PlayerCardStatus } from '@/types/matchEvent';
import { HandHeart, Shield, Square } from 'lucide-react';
import { FootballIcon } from './icons/FootballIcon';

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
  const [isOpen, setIsOpen] = useState(false);

  const handleEventClick = (eventType: MatchEventType) => {
    onEventSelect(eventType);
    setIsOpen(false); // Close immediately after selection
  };

  const isCardDisabled = cardStatus.hasRed;
  const showSecondYellow = cardStatus.hasYellow && !cardStatus.hasRed;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
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
            <FootballIcon className="h-5 w-5 text-green-500" />
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
                  <Square className="h-5 w-5 fill-red-600" />
                  <span>2nd Yellow (Red)</span>
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 h-12 text-yellow-600"
                  onClick={() => handleEventClick('yellow_card')}
                >
                  <Square className="h-5 w-5 fill-yellow-500" />
                  <span>Yellow Card</span>
                </Button>
              )}

              <Button
                variant="ghost"
                className="w-full justify-start gap-2 h-12 text-red-600"
                onClick={() => handleEventClick('red_card')}
              >
                <Square className="h-5 w-5 fill-red-600" />
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
