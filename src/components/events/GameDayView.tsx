import React, { useState, useEffect } from 'react';
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
        .select(`
          *,
          captain:captain_id(id, name, squad_number),
          performance_category:performance_category_id(id, name, color)
        `)
        .eq('event_id', eventId)
        .order('team_number', { ascending: true })
        .order('period_number', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    retry: 1
  });

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

  // Parse positions from player_positions JSON
  const positions = currentSelection?.player_positions 
    ? (() => {
        const playerPositions = currentSelection.player_positions;
        
        // Check if it's already an array
        if (Array.isArray(playerPositions)) {
          return playerPositions.map((pos: any) => ({
            playerId: pos.playerId,
            playerName: pos.playerName || 'Unknown',
            squadNumber: pos.squadNumber || 0,
            position: pos.positionName || pos.position || 'Unknown',
            positionGroup: pos.positionGroup || 'midfielder',
            x: pos.x || 50,
            y: pos.y || 50,
            isCaptain: pos.playerId === currentSelection.captain_id
          }));
        }
        
        // It's an object - convert to array
        return Object.entries(playerPositions as Record<string, any>).map(([key, pos]: [string, any]) => ({
          playerId: pos.playerId,
          playerName: pos.playerName || 'Unknown',
          squadNumber: pos.squadNumber || 0,
          position: pos.positionName || key,
          positionGroup: pos.positionGroup || 'midfielder',
          x: pos.x || 50,
          y: pos.y || 50,
          isCaptain: pos.playerId === currentSelection.captain_id
        }));
      })()
    : [];

  // Parse substitutes
  const substitutes = currentSelection?.substitutes 
    ? (currentSelection.substitutes as any[]).map((sub: any) => ({
        id: sub.playerId || sub.id,
        name: sub.playerName || sub.name || 'Unknown',
        squad_number: sub.squadNumber || 0,
        position: sub.position || 'SUB',
        isUsed: false
      }))
    : [];

  const handlePlayerLongPress = (playerId: string) => {
    toast.info('Long press a player on the pitch to log events');
  };

  return (
    <div className="game-day-container">
      {/* Header */}
      <div className="game-day-header">
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="text-center">
            <h1 className="text-lg font-bold">{event.title}</h1>
            <p className="text-sm text-muted-foreground">
              {event.opponent ? `vs ${event.opponent}` : 'Training'}
            </p>
          </div>
          
          <div className="w-20" />
        </div>

        {/* Score and Timer */}
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <div className="match-timer">{displayTime}</div>
          </div>
          
          {event.scores && (
            <div className="text-center flex-1">
              <div className="match-score">
                {(event.scores as any)?.home || 0} - {(event.scores as any)?.away || 0}
              </div>
            </div>
          )}
        </div>

        {/* Timer Controls */}
        <div className="flex gap-2 justify-center mt-3">
          <Button
            size="sm"
            variant="outline"
            onClick={isRunning ? pause : start}
          >
            {isRunning ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start
              </>
            )}
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={reset}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="game-day-content">
        {/* Timeline */}
        <div className="p-4">
          <GameDayTimeline
            matchEvents={matchEvents}
            periodDuration={periodDuration}
            totalPeriods={totalPeriods}
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

          {/* Period Navigation */}
          {totalPeriods > 1 && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePreviousPeriod}
                disabled={currentPeriodIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="period-indicators">
                {Array.from({ length: totalPeriods }).map((_, i) => (
                  <button
                    key={i}
                    className={`period-dot ${i === currentPeriodIndex ? 'active' : ''}`}
                    onClick={() => setCurrentPeriodIndex(i)}
                  />
                ))}
              </div>
              
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextPeriod}
                disabled={currentPeriodIndex === totalPeriods - 1}
              >
                <ChevronRight className="h-4 w-4" />
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
