import React, { useState, useEffect } from 'react';
import { useLongPress } from '@/hooks/useLongPress';
import { GameDayPlayerEventMenu } from './GameDayPlayerEventMenu';
import { FPLPlayerToken } from './FPLPlayerToken';
import { MatchEvent, MatchEventType, PlayerCardStatus } from '@/types/matchEvent';
import { matchEventService } from '@/services/matchEventService';
import { playerMatchStatsService } from '@/services/stats/playerMatchStatsService';
import { toast } from 'sonner';

interface PlayerPosition {
  playerId: string;
  playerName: string;
  squadNumber: number;
  position: string;
  positionGroup: 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
  x: number;
  y: number;
  isCaptain?: boolean;
  minutesPlayed?: number;
  isSubstitute?: boolean;
  replacedPlayerId?: string;
  replacedPlayerName?: string;
  photoUrl?: string;
}

interface SubstitutePlayer {
  id: string;
  name: string;
  squad_number: number;
  position: string;
  isUsed?: boolean;
  photo_url?: string;
}

interface GameDayFormationCardProps {
  eventId: string;
  teamId: string;
  periodNumber: number;
  formation: string;
  positions: PlayerPosition[];
  periodDuration: number;
  substitutes: SubstitutePlayer[];
  matchEvents: MatchEvent[];
  onEventCreated: (event: MatchEvent) => void;
  onSubstitution?: (playerOffId: string, playerOnId: string) => void;
  currentMinute?: number;
}

export const GameDayFormationCard: React.FC<GameDayFormationCardProps> = ({
  eventId,
  teamId,
  periodNumber,
  formation,
  positions,
  periodDuration,
  substitutes,
  matchEvents,
  onEventCreated,
  onSubstitution,
  currentMinute = 0,
}) => {
  const [playerCardStatuses, setPlayerCardStatuses] = useState<Record<string, PlayerCardStatus>>({});
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  useEffect(() => {
    const loadCardStatuses = async () => {
      const statuses: Record<string, PlayerCardStatus> = {};
      for (const pos of positions) {
        const status = await matchEventService.getPlayerCardStatus(eventId, pos.playerId);
        statuses[pos.playerId] = status;
      }
      setPlayerCardStatuses(statuses);
    };

    loadCardStatuses();
  }, [eventId, positions, matchEvents]);

  const handleEventSelect = async (playerId: string, eventType: MatchEventType) => {
    try {
      const newEvent = await matchEventService.createMatchEvent({
        eventId,
        playerId,
        teamId,
        eventType,
        minute: currentMinute,
        periodNumber
      });

      toast.success(`${eventType.replace('_', ' ')} recorded!`);
      onEventCreated(newEvent);
      await playerMatchStatsService.updateEventPlayerStats(eventId);
      setSelectedPlayer(null);
    } catch (error) {
      console.error('Error creating match event:', error);
      toast.error('Failed to record event');
    }
  };

  const handleEventDelete = async () => {
    try {
      await playerMatchStatsService.updateEventPlayerStats(eventId);
      toast.success('Event deleted');
    } catch (error) {
      console.error('Error updating stats after delete:', error);
    }
  };

  const handleSubstitution = async (playerOffId: string, playerOnId: string, playerOffName: string, playerOnName: string) => {
    try {
      const newEvent = await matchEventService.createSubstitution({
        eventId,
        playerOffId,
        playerOnId,
        playerOffName,
        playerOnName,
        teamId,
        minute: currentMinute,
        periodNumber
      });
      toast.success(`${playerOffName} → ${playerOnName}`);
      
      if (onSubstitution) {
        onSubstitution(playerOffId, playerOnId);
      }
      
      onEventCreated(newEvent);
      setSelectedPlayer(null);
    } catch (error) {
      console.error('Error creating substitution:', error);
      toast.error("Failed to create substitution");
    }
  };

  const getPlayerEvents = (playerId: string) => {
    return matchEvents.filter(e => e.player_id === playerId);
  };

  const renderPlayerBadges = (playerId: string) => {
    const events = getPlayerEvents(playerId);
    if (events.length === 0) return null;

    const goals = events.filter(e => e.event_type === 'goal').length;
    const assists = events.filter(e => e.event_type === 'assist').length;
    const yellowCards = events.filter(e => e.event_type === 'yellow_card').length;
    const redCards = events.filter(e => e.event_type === 'red_card').length;
    const substitutions = events.filter(e => e.event_type === 'substitution').length;

    const badges = [];
    
    if (goals > 0) {
      badges.push(
        <div key="goals" className="event-badge-mini goal">
          {goals > 1 ? goals : '⚽'}
        </div>
      );
    }
    if (assists > 0) {
      badges.push(
        <div key="assists" className="event-badge-mini assist">
          A
        </div>
      );
    }
    if (yellowCards > 0) {
      badges.push(
        <div key="yellow" className="event-badge-mini yellow-card" />
      );
    }
    if (redCards > 0) {
      badges.push(
        <div key="red" className="event-badge-mini red-card" />
      );
    }
    if (substitutions > 0) {
      badges.push(
        <div key="sub" className="event-badge-mini substitution">
          ↔
        </div>
      );
    }

    return badges.length > 0 ? (
      <div className="event-badges-enhanced">
        {badges}
      </div>
    ) : null;
  };

  return (
    <div className="period-card flex flex-col flex-1 min-h-0">
      <div className="text-center py-1 shrink-0">
        <p className="text-xs font-semibold text-muted-foreground">
          {formation}
        </p>
      </div>

      <div className="formation-pitch flex-1 min-h-0">
        {/* Pitch Field */}
        <div className="pitch-field">
          {/* Pitch markings */}
          <div className="pitch-center-line" />
          <div className="pitch-center-circle" />
          <div className="pitch-center-spot" />
          <div className="goal-box-top" />
          <div className="goal-box-bottom" />
          
          {/* Player positions using FPL tokens */}
          {positions.map((pos) => {
            const cardStatus = playerCardStatuses[pos.playerId] || { hasYellow: false, hasRed: false };
            const isGoalkeeper = pos.positionGroup === 'goalkeeper';
            
            const longPressHandlers = useLongPress(() => {
              setSelectedPlayer(pos.playerId);
            });

            return (
              <GameDayPlayerEventMenu
                key={pos.playerId}
                eventId={eventId}
                playerId={pos.playerId}
                playerName={pos.playerName}
                teamId={teamId}
                isGoalkeeper={isGoalkeeper}
                cardStatus={cardStatus}
                availableSubstitutes={substitutes}
                onEventSelect={(eventType) => handleEventSelect(pos.playerId, eventType)}
                onEventDelete={handleEventDelete}
                onSubstitution={handleSubstitution}
              >
                <div
                  className="absolute"
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 20,
                    touchAction: 'none',
                  }}
                  {...longPressHandlers}
                >
                  {/* Show replaced player name label */}
                  {pos.replacedPlayerName && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-[8px] font-bold px-2 py-0.5 rounded whitespace-nowrap z-30">
                      {pos.replacedPlayerName.split(' ')[0]}
                    </div>
                  )}
                  
                  {/* FPL-style player token */}
                  <div className="relative">
                    {/* Event Badges */}
                    {renderPlayerBadges(pos.playerId)}
                    
                    <FPLPlayerToken
                      name={pos.playerName}
                      squadNumber={pos.squadNumber}
                      positionGroup={pos.positionGroup}
                      isCaptain={pos.isCaptain}
                      size="pitch"
                    />
                  </div>
                </div>
              </GameDayPlayerEventMenu>
            );
          })}
        </div>
      </div>
    </div>
  );
};
