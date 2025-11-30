import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MatchEvent, MatchEventType, PlayerCardStatus } from '@/types/matchEvent';
import { HandHeart, Shield, Square, Trash2, ArrowLeftRight } from 'lucide-react';
import { FootballIcon } from './icons/FootballIcon';
import { matchEventService } from '@/services/matchEventService';

interface SubstitutePlayer {
  id: string;
  name: string;
  squad_number: number;
  position: string;
}

interface GameDayPlayerEventMenuProps {
  eventId: string;
  playerId: string;
  playerName: string;
  teamId: string;
  isGoalkeeper: boolean;
  cardStatus: PlayerCardStatus;
  availableSubstitutes?: SubstitutePlayer[];
  onEventSelect: (eventType: MatchEventType) => void;
  onEventDelete: () => void;
  onSubstitution?: (playerOffId: string, playerOnId: string, playerOffName: string, playerOnName: string) => void;
  children: React.ReactNode;
}

export const GameDayPlayerEventMenu: React.FC<GameDayPlayerEventMenuProps> = ({
  eventId,
  playerId,
  playerName,
  teamId,
  isGoalkeeper,
  cardStatus,
  availableSubstitutes = [],
  onEventSelect,
  onEventDelete,
  onSubstitution,
  children
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [existingEvents, setExistingEvents] = useState<MatchEvent[]>([]);
  const [showSubstituteSelect, setShowSubstituteSelect] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPlayerEvents();
      setShowSubstituteSelect(false);
    }
  }, [isOpen]);

  const loadPlayerEvents = async () => {
    try {
      const events = await matchEventService.getPlayerMatchEvents(eventId, playerId);
      setExistingEvents(events);
    } catch (error) {
      console.error('Error loading player events:', error);
    }
  };

  const handleEventClick = (eventType: MatchEventType) => {
    if (eventType === 'substitution') {
      setShowSubstituteSelect(true);
    } else {
      onEventSelect(eventType);
      setIsOpen(false);
    }
  };

  const handleSubstituteSelect = (substituteId: string, substituteName: string) => {
    if (onSubstitution) {
      onSubstitution(playerId, substituteId, playerName, substituteName);
    }
    setShowSubstituteSelect(false);
    setIsOpen(false);
  };

  const handleDelete = async (matchEventId: string) => {
    try {
      await matchEventService.deleteMatchEvent(matchEventId);
      onEventDelete();
      await loadPlayerEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const getEventLabel = (eventType: MatchEventType): string => {
    switch (eventType) {
      case 'goal': return 'Goal';
      case 'assist': return 'Assist';
      case 'save': return 'Save';
      case 'yellow_card': return 'Yellow Card';
      case 'red_card': return 'Red Card';
      case 'substitution': return 'Substitution';
      default: return eventType;
    }
  };

  const isCardDisabled = cardStatus.hasRed;
  const showSecondYellow = cardStatus.hasYellow && !cardStatus.hasRed;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="center">
        {showSubstituteSelect ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Select Substitute</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSubstituteSelect(false)}
              >
                Back
              </Button>
            </div>
            <ScrollArea className="h-[200px]">
              <div className="space-y-1">
                {availableSubstitutes.length === 0 ? (
                  <div className="text-sm text-muted-foreground px-2 py-4 text-center">
                    No substitutes available
                  </div>
                ) : (
                  availableSubstitutes.map((sub) => (
                    <Button
                      key={sub.id}
                      variant="ghost"
                      className="w-full justify-start text-left"
                      onClick={() => handleSubstituteSelect(sub.id, sub.name)}
                    >
                      <span className="font-medium mr-2">#{sub.squad_number}</span>
                      <span>{sub.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{sub.position}</span>
                    </Button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold">{playerName}</p>
            
            {existingEvents.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">Recorded Events</h4>
                <div className="space-y-1">
                  {existingEvents.map((event) => (
                    <div 
                      key={event.id}
                      className="flex items-center justify-between bg-muted/50 rounded-md px-2 py-1.5"
                    >
                      <span className="text-sm">
                        {getEventLabel(event.event_type)}
                        {event.minute !== null && event.minute !== undefined && ` (${event.minute}')`}
                      </span>
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="text-destructive hover:text-destructive/80 p-1 rounded-sm hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">Add Event</h4>
              <div className="space-y-1">
            
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

                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 h-12"
                  onClick={() => handleEventClick('substitution')}
                  disabled={availableSubstitutes.length === 0}
                >
                  <ArrowLeftRight className="h-5 w-5 text-cyan-500" />
                  <span>Sub</span>
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
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
