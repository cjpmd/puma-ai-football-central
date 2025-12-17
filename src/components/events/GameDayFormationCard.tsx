import React, { useState, useEffect } from 'react';
import { useLongPress } from '@/hooks/useLongPress';
import { GameDayPlayerEventMenu } from './GameDayPlayerEventMenu';
import { MatchEvent, MatchEventType, PlayerCardStatus, SubstitutionData } from '@/types/matchEvent';
import { matchEventService } from '@/services/matchEventService';
import { playerMatchStatsService } from '@/services/stats/playerMatchStatsService';
import { FootballIcon } from './icons/FootballIcon';
import { Star, ArrowLeftRight } from 'lucide-react';
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

interface SubstitutePlayer {
  id: string;
  name: string;
  squad_number: number;
  position: string;
  isUsed?: boolean;
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
      
      // Add event to UI and close menu
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
    const substitutions = events.filter(e => e.event_type === 'substitution');
    const hasYellow = events.some(e => e.event_type === 'yellow_card');
    const hasRed = events.some(e => e.event_type === 'red_card');

    // Check if this player was substituted off or on
    const wasSubbedOff = substitutions.some(e => e.player_id === playerId);
    let wasSubbedOn = false;
    substitutions.forEach(sub => {
      try {
        const subData: SubstitutionData = JSON.parse(sub.notes || '{}');
        if (subData.playerOnId === playerId) {
          wasSubbedOn = true;
        }
      } catch (e) {
        // Invalid JSON, skip
      }
    });

    return (
      <div className="player-badges">
        {isCaptain && (
          <div className="event-badge captain">
            <Star className="h-2 w-2" fill="white" />
          </div>
        )}
        {goals > 0 && (
          <div className="goal-badges-container">
            {Array.from({ length: Math.min(goals, 5) }).map((_, idx) => (
              <div key={`goal-${idx}`} className="event-badge goal">
                <FootballIcon className="h-3 w-3" />
              </div>
            ))}
            {goals > 5 && (
              <span className="text-xs font-bold ml-1">+{goals - 5}</span>
            )}
          </div>
        )}
        {assists > 0 && (
          <div className="event-badge assist ml-1">
            <span className="text-[8px] font-bold">{assists}A</span>
          </div>
        )}
        {saves > 0 && (
          <div className="event-badge save ml-1">
            <span className="text-[8px] font-bold">{saves}S</span>
          </div>
        )}
        {hasYellow && !hasRed && (
          <div className="event-badge yellow-card ml-1">
            <span className="text-[8px] font-bold">Y</span>
          </div>
        )}
        {hasRed && (
          <div className="event-badge red-card ml-1">
            <span className="text-[8px] font-bold text-white">R</span>
          </div>
        )}
        {wasSubbedOff && (
          <div className="event-badge substitution-out ml-1">
            <ArrowLeftRight className="h-3 w-3" />
          </div>
        )}
        {wasSubbedOn && (
          <div className="event-badge substitution-in ml-1">
            <ArrowLeftRight className="h-3 w-3" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="period-card flex flex-col flex-1 min-h-0">
      <div className="text-center py-1 shrink-0">
        <p className="text-xs font-semibold text-muted-foreground">
          {formation}
        </p>
      </div>

      <div className="formation-pitch flex-1 min-h-0">
        <div className="goal-box-top"></div>
        <div className="goal-box-bottom"></div>
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
                  {renderPlayerBadges(pos.playerId, pos.isCaptain)}
                  
                  {/* Position abbreviation - colored text */}
                  <div className="position-badge-inline">
                    {getPositionAbbreviation(pos.position)}
                  </div>
                  
                  {/* Player name */}
                  <div className="player-circle-name">{pos.playerName.split(' ')[0]}</div>
                  
                  {/* Squad number */}
                  <div className="player-number">#{pos.squadNumber}</div>
                </div>
              </div>
            </GameDayPlayerEventMenu>
          );
        })}
      </div>
    </div>
  );
};
