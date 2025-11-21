import React, { useState, useEffect } from 'react';
import { useLongPress } from '@/hooks/useLongPress';
import { GameDayPlayerEventMenu } from './GameDayPlayerEventMenu';
import { MatchEvent, MatchEventType, PlayerCardStatus } from '@/types/matchEvent';
import { matchEventService } from '@/services/matchEventService';
import { Trophy, Star } from 'lucide-react';
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
}

interface GameDayFormationCardProps {
  eventId: string;
  teamId: string;
  periodNumber: number;
  formation: string;
  positions: PlayerPosition[];
  periodDuration: number;
  matchEvents: MatchEvent[];
  onEventCreated: (event: MatchEvent) => void;
  currentMinute?: number;
}

export const GameDayFormationCard: React.FC<GameDayFormationCardProps> = ({
  eventId,
  teamId,
  periodNumber,
  formation,
  positions,
  periodDuration,
  matchEvents,
  onEventCreated,
  currentMinute = 0
}) => {
  const [playerCardStatuses, setPlayerCardStatuses] = useState<Record<string, PlayerCardStatus>>({});
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  useEffect(() => {
    // Load card statuses for all players
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
      setSelectedPlayer(null);
    } catch (error) {
      console.error('Error creating match event:', error);
      toast.error('Failed to record event');
    }
  };

  const getPlayerEvents = (playerId: string) => {
    return matchEvents.filter(e => e.player_id === playerId);
  };

  const getPositionGroupClass = (group: string) => {
    switch (group) {
      case 'goalkeeper':
        return 'goalkeeper';
      case 'defender':
        return 'defender';
      case 'midfielder':
        return 'midfielder';
      case 'forward':
        return 'forward';
      default:
        return '';
    }
  };

  const getPositionAbbreviation = (position: string): string => {
    const abbreviations: Record<string, string> = {
      'Goalkeeper': 'GK',
      'Left Back': 'LB',
      'Right Back': 'RB',
      'Centre Back': 'CB',
      'Left Wing Back': 'LWB',
      'Right Wing Back': 'RWB',
      'Left Midfield': 'LM',
      'Right Midfield': 'RM',
      'Centre Midfield': 'CM',
      'Defensive Midfield': 'CDM',
      'Attacking Midfield': 'CAM',
      'Left Wing': 'LW',
      'Right Wing': 'RW',
      'Centre Forward': 'CF',
      'Striker': 'ST',
      'Left Forward': 'LF',
      'Right Forward': 'RF'
    };
    
    return abbreviations[position] || position.substring(0, 2).toUpperCase();
  };

  const renderPlayerBadges = (playerId: string, isCaptain?: boolean) => {
    const events = getPlayerEvents(playerId);
    const goals = events.filter(e => e.event_type === 'goal').length;
    const assists = events.filter(e => e.event_type === 'assist').length;
    const saves = events.filter(e => e.event_type === 'save').length;
    const hasYellow = events.some(e => e.event_type === 'yellow_card');
    const hasRed = events.some(e => e.event_type === 'red_card');

    return (
      <div className="player-badges">
        {isCaptain && (
          <div className="event-badge captain">
            <Star className="h-2 w-2" fill="white" />
          </div>
        )}
        {goals > 0 && (
          <div className="event-badge goal">
            <Trophy className="h-2 w-2" />
          </div>
        )}
        {hasYellow && !hasRed && (
          <div className="event-badge yellow-card">
            <span className="text-[8px] font-bold">Y</span>
          </div>
        )}
        {hasRed && (
          <div className="event-badge red-card">
            <span className="text-[8px] font-bold text-white">R</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="period-card">
      <div className="text-center mb-2">
        <h3 className="text-lg font-semibold">Period {periodNumber}</h3>
        <p className="text-sm text-muted-foreground">{formation}</p>
      </div>

      <div className="formation-pitch">
        {positions.map((pos) => {
          const cardStatus = playerCardStatuses[pos.playerId] || { hasYellow: false, hasRed: false };
          const isGoalkeeper = pos.positionGroup === 'goalkeeper';
          
          const longPressHandlers = useLongPress(() => {
            setSelectedPlayer(pos.playerId);
          });

          const playerCircleClass = [
            'player-circle',
            getPositionGroupClass(pos.positionGroup),
            cardStatus.hasRed ? 'has-red-card' : '',
            pos.isSubstitute === false ? 'substituted-off' : '',
            pos.isSubstitute === true ? 'substituted-on' : ''
          ].filter(Boolean).join(' ');

          return (
            <GameDayPlayerEventMenu
              key={pos.playerId}
              playerId={pos.playerId}
              playerName={pos.playerName}
              isGoalkeeper={isGoalkeeper}
              cardStatus={cardStatus}
              onEventSelect={(eventType) => handleEventSelect(pos.playerId, eventType)}
            >
              <div
                className="player-position"
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
                {...longPressHandlers}
              >
                {/* Show replaced player name in yellow box */}
                {pos.replacedPlayerName && (
                  <div className="replaced-player-label">
                    {pos.replacedPlayerName.split(' ')[0]}
                  </div>
                )}
                
                <div className={playerCircleClass}>
                  {/* Position badge inside circle at top */}
                  <div className="position-badge-inline">
                    {getPositionAbbreviation(pos.position)}
                  </div>
                  
                  {renderPlayerBadges(pos.playerId, pos.isCaptain)}
                  
                  {/* Squad number in center */}
                  <div className="player-number">{pos.squadNumber}</div>
                  
                  {/* Minutes at bottom of circle */}
                  {pos.minutesPlayed !== undefined && (
                    <div className="player-minutes-inline">{pos.minutesPlayed}'</div>
                  )}
                </div>
                
                {/* Player name below circle */}
                <div className="player-name">{pos.playerName.split(' ')[0]}</div>
              </div>
            </GameDayPlayerEventMenu>
          );
        })}
      </div>
    </div>
  );
};
