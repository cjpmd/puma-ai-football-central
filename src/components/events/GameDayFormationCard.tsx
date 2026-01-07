import React, { useState, useEffect } from 'react';
import { useLongPress } from '@/hooks/useLongPress';
import { GameDayPlayerEventMenu } from './GameDayPlayerEventMenu';
import { MatchEvent, MatchEventType, PlayerCardStatus, SubstitutionData } from '@/types/matchEvent';
import { matchEventService } from '@/services/matchEventService';
import { playerMatchStatsService } from '@/services/stats/playerMatchStatsService';
import { PlayerShirtFallback } from '@/components/shared/PlayerShirtFallback';
import { KitDesign } from '@/types/team';
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
  kitDesign?: KitDesign;
  goalkeeperKitDesign?: KitDesign;
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
  kitDesign,
  goalkeeperKitDesign
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

  const getPositionGroup = (group: string): string => {
    switch (group) {
      case 'goalkeeper': return 'goalkeeper';
      case 'defender': return 'defender';
      case 'midfielder': return 'midfielder';
      case 'forward': return 'forward';
      default: return 'midfielder';
    }
  };

  const getPlayerInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getPlayerSurname = (name: string): string => {
    const parts = name.trim().split(' ');
    return parts.length > 1 ? parts[parts.length - 1] : parts[0];
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
        {/* 3D Tilted Pitch Field */}
        <div className="pitch-field">
          {/* Pitch markings */}
          <div className="pitch-center-line" />
          <div className="pitch-center-circle" />
          <div className="pitch-center-spot" />
          <div className="goal-box-top" />
          <div className="goal-box-bottom" />
          
          {/* Player positions */}
          {positions.map((pos) => {
            const cardStatus = playerCardStatuses[pos.playerId] || { hasYellow: false, hasRed: false };
            const isGoalkeeper = pos.positionGroup === 'goalkeeper';
            
            const longPressHandlers = useLongPress(() => {
              setSelectedPlayer(pos.playerId);
            });

            const cardStatusClass = cardStatus.hasRed 
              ? 'has-red-card' 
              : pos.isSubstitute === false 
                ? 'substituted' 
                : '';

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
                  
                  {/* Enhanced Fantasy-style player card */}
                  <div className={`player-card-enhanced ${cardStatusClass}`}>
                    {/* Captain Badge */}
                    {pos.isCaptain && (
                      <div className="captain-badge-enhanced">
                        <span>C</span>
                      </div>
                    )}
                    
                    {/* Event Badges */}
                    {renderPlayerBadges(pos.playerId)}
                    
                    {/* Player Image */}
                    <div className="player-image-enhanced">
                      {pos.photoUrl ? (
                        <>
                          <img 
                            src={pos.photoUrl} 
                            alt={pos.playerName}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.nextElementSibling;
                              if (fallback) fallback.classList.remove('hidden');
                            }}
                          />
                          <div className="hidden">
                            <PlayerShirtFallback 
                              kitDesign={kitDesign} 
                              goalkeeperKitDesign={goalkeeperKitDesign}
                              isGoalkeeper={isGoalkeeper}
                              size="sm" 
                              squadNumber={pos.squadNumber} 
                            />
                          </div>
                        </>
                      ) : (
                        <PlayerShirtFallback 
                          kitDesign={kitDesign} 
                          goalkeeperKitDesign={goalkeeperKitDesign}
                          isGoalkeeper={isGoalkeeper}
                          size="sm" 
                          squadNumber={pos.squadNumber} 
                        />
                      )}
                    </div>
                    
                    {/* Name Bar */}
                    <div className="player-name-bar">
                      <span>{getPlayerSurname(pos.playerName)}</span>
                    </div>
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
