import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { GameDayFormationCard } from './GameDayFormationCard';
import { GameDayTimeline } from './GameDayTimeline';
import { GameDaySubstituteBench } from './GameDaySubstituteBench';
import { useMatchTimer } from '@/hooks/useMatchTimer';
import { matchEventService } from '@/services/matchEventService';
import { MatchEvent } from '@/types/matchEvent';
import { ArrowLeft, Play, Pause, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import '@/styles/game-day.css';

export const GameDayView: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [currentPeriodIndex, setCurrentPeriodIndex] = useState(0);
  const [matchEvents, setMatchEvents] = useState<MatchEvent[]>([]);
  
  const { 
    data: event, 
    error: eventError, 
    isLoading: eventLoading 
  } = useQuery({
    queryKey: ['event', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    retry: 1
  });

  const { 
    data: eventSelections, 
    error: selectionsError, 
    isLoading: selectionsLoading 
  } = useQuery({
    queryKey: ['event-selections', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_selections')
        .select('*')
        .eq('event_id', eventId)
        .order('team_number', { ascending: true })
        .order('period_number', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    retry: 1
  });

  // Fetch players for enriching player data
  const { data: players } = useQuery({
    queryKey: ['team-players', event?.team_id],
    enabled: !!event?.team_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('id, name, squad_number')
        .eq('team_id', event.team_id);
      if (error) throw error;
      return data || [];
    }
  });

  // Create player lookup map
  const playerMap = useMemo(() => {
    const map = new Map();
    players?.forEach(p => {
      map.set(p.id, { name: p.name, squadNumber: p.squad_number });
    });
    return map;
  }, [players]);

  const gameDuration = event?.game_duration || 50;
  const {
    currentMinute,
    isRunning,
    start,
    pause,
    reset,
    displayTime
  } = useMatchTimer(gameDuration);

  useEffect(() => {
    if (eventId) {
      loadMatchEvents();
    }
  }, [eventId]);

  const loadMatchEvents = async () => {
    if (!eventId) return;
    try {
      const events = await matchEventService.getMatchEvents(eventId);
      setMatchEvents(events);
    } catch (error) {
      console.error('Error loading match events:', error);
    }
  };

  const handleEventCreated = (newEvent: MatchEvent) => {
    setMatchEvents(prev => [...prev, newEvent]);
  };

  const handlePreviousPeriod = () => {
    if (currentPeriodIndex > 0) {
      setCurrentPeriodIndex(prev => prev - 1);
    }
  };

  const handleNextPeriod = () => {
    if (eventSelections && currentPeriodIndex < eventSelections.length - 1) {
      setCurrentPeriodIndex(prev => prev + 1);
    }
  };

  // Handle loading state
  if (eventLoading || selectionsLoading) {
    return (
      <div className="game-day-container">
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-muted-foreground">Loading game details...</p>
        </div>
      </div>
    );
  }

  // Handle errors
  if (eventError || selectionsError) {
    console.error('GameDayView error', { eventError, selectionsError, eventId });
    return (
      <div className="game-day-container">
        <div className="flex flex-col items-center justify-center h-full text-center px-4 gap-4">
          <p className="text-sm text-destructive">
            Sorry, we couldn't load Game Day for this event.
          </p>
          <p className="text-xs text-muted-foreground">
            Please check the team selection and try again.
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            Back to Events
          </Button>
        </div>
      </div>
    );
  }

  // Handle event not found
  if (!event) {
    return (
      <div className="game-day-container">
        <div className="flex flex-col items-center justify-center h-full text-center px-4 gap-4">
          <p className="text-sm">Event not found.</p>
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            Back to Calendar
          </Button>
        </div>
      </div>
    );
  }

  // Handle no team selections
  if (!eventSelections || eventSelections.length === 0) {
    return (
      <div className="game-day-container">
        <div className="flex flex-col items-center justify-center h-full text-center px-4 gap-4">
          <p className="text-sm font-medium">No Game Day data found for this event.</p>
          <p className="text-xs text-muted-foreground">
            Please set up your team and periods in the Squad / Team Selection view first.
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            Back to Events
          </Button>
        </div>
      </div>
    );
  }

  // Debug logging
  console.log('GameDayView - event', event);
  console.log('GameDayView - eventSelections count', eventSelections.length);

  const currentSelection = eventSelections[currentPeriodIndex];
  const totalPeriods = eventSelections.length;
  const periodDuration = currentSelection?.duration_minutes || 25;

  // Parse positions from player_positions JSON with enriched data
  const positions = currentSelection?.player_positions 
    ? (() => {
        const playerPositions = currentSelection.player_positions;
        const previousSelection = currentPeriodIndex > 0 ? eventSelections[currentPeriodIndex - 1] : null;
        const previousPositions = previousSelection?.player_positions || [];
        
        // Create a map of position -> playerId from previous period
        const previousPositionMap = new Map();
        if (Array.isArray(previousPositions)) {
          previousPositions.forEach((pos: any) => {
            const posKey = `${pos.positionGroup}-${Math.round(pos.x)}-${Math.round(pos.y)}`;
            previousPositionMap.set(posKey, pos.playerId);
          });
        }
        
        // Check if it's already an array
        if (Array.isArray(playerPositions)) {
          return playerPositions.map((pos: any) => {
            const playerInfo = playerMap.get(pos.playerId);
            
            // Check if this position had a different player in previous period
            const posKey = `${pos.positionGroup}-${Math.round(pos.x)}-${Math.round(pos.y)}`;
            const previousPlayerId = previousPositionMap.get(posKey);
            const wasReplaced = previousPlayerId && previousPlayerId !== pos.playerId;
            
            return {
              playerId: pos.playerId,
              playerName: playerInfo?.name || pos.playerName || 'Unknown',
              squadNumber: playerInfo?.squadNumber ?? pos.squadNumber ?? 0,
              position: pos.positionName || pos.position || 'Unknown',
              positionGroup: pos.positionGroup || 'midfielder',
              x: pos.x || 50,
              y: pos.y || 50,
              isCaptain: pos.playerId === currentSelection.captain_id,
              replacedPlayerId: wasReplaced ? previousPlayerId : undefined,
              replacedPlayerName: wasReplaced ? playerMap.get(previousPlayerId)?.name : undefined,
              minutesPlayed: pos.minutesPlayed
            };
          });
        }
        
        return [];
      })()
    : [];

  // Collect ALL substitute players from all periods for this event
  const allSubstituteIdsSet = new Set<string>();

  eventSelections.forEach((sel: any) => {
    const subs = (sel.substitute_players as string[] | null) || [];
    subs.forEach((id) => {
      if (id) allSubstituteIdsSet.add(id);
    });
  });

  const allSubstituteIds = Array.from(allSubstituteIdsSet);

  // Build substitute objects and mark as used if currently on the pitch
  const substitutes = allSubstituteIds.map((subId: string) => {
    const playerInfo = playerMap.get(subId);
    const isOnPitch = positions.some((p) => p.playerId === subId);

    return {
      id: subId,
      name: playerInfo?.name || 'Unknown',
      squad_number: playerInfo?.squadNumber || 0,
      position: 'SUB',
      isUsed: isOnPitch, // highlighted if currently on pitch in this period
    };
  });

  const handlePlayerLongPress = (playerId: string) => {
    toast.info('Long press a player on the pitch to log events');
  };

  return (
    <div className="game-day-container">
      {/* Compact Header */}
      <div className="game-day-header-compact">
        {/* Row 1: back + title/opponent + compact controls */}
        <div className="flex items-center justify-between px-2 py-1 gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex-1 text-center">
            <h1 className="text-xs font-semibold leading-tight truncate">
              {event.title}
            </h1>
            <p className="text-[10px] text-muted-foreground truncate">
              {event.opponent ? `vs ${event.opponent}` : 'Training'}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={isRunning ? pause : start}
            >
              {isRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={reset}
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Row 2: small period/formation + compact timer/score */}
        <div className="flex items-center justify-between px-2 pb-1">
          <div className="text-[10px] text-muted-foreground">
            Period {currentSelection.period_number}
            {currentSelection.formation && ` • ${currentSelection.formation}`}
          </div>

          <div className="flex items-center gap-2">
            <div className="match-timer-compact text-xl leading-none">
              {displayTime}
            </div>
            {event.scores && (
              <div className="match-score-compact text-sm leading-none">
                {(event.scores as any)?.home || 0} - {(event.scores as any)?.away || 0}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="game-day-content">
        {/* Compact Timeline */}
        <div className="px-2 py-1">
          <GameDayTimeline
            matchEvents={matchEvents}
            periodDuration={periodDuration}
            totalPeriods={totalPeriods}
            compact={true}
          />
        </div>

        {/* Formation Display */}
        <div className="relative">
          <div className="periods-carousel">
            <GameDayFormationCard
              eventId={eventId!}
              teamId={event.team_id}
              periodNumber={currentSelection.period_number}
              formation={currentSelection.formation}
              positions={positions}
              periodDuration={periodDuration}
              matchEvents={matchEvents}
              onEventCreated={handleEventCreated}
              currentMinute={currentMinute}
            />
          </div>

          {/* Period Navigation with Time Ranges */}
          {totalPeriods > 1 && (
            <div className="flex items-center justify-center gap-2 mt-2 px-2">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={handlePreviousPeriod}
                disabled={currentPeriodIndex === 0}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              
              <div className="flex gap-1 flex-1 justify-center overflow-x-auto">
                {eventSelections.map((sel, i) => {
                  const startMin = eventSelections
                    .slice(0, i)
                    .reduce((sum, s) => sum + (s.duration_minutes || 25), 0);
                  const endMin = startMin + (sel.duration_minutes || 25);
                  
                  return (
                    <button
                      key={i}
                      className={`period-time-button ${i === currentPeriodIndex ? 'active' : ''}`}
                      onClick={() => setCurrentPeriodIndex(i)}
                    >
                      <div className="text-sm font-semibold">{startMin}-{endMin}'</div>
                    </button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={handleNextPeriod}
                disabled={currentPeriodIndex === totalPeriods - 1}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Substitutes */}
        {substitutes.length > 0 && (
          <div className="p-4">
            <h3 className="text-sm font-semibold mb-2">Substitutes</h3>
            <GameDaySubstituteBench
              substitutes={substitutes}
              onPlayerLongPress={handlePlayerLongPress}
            />
          </div>
        )}
      </div>
    </div>
  );
};
