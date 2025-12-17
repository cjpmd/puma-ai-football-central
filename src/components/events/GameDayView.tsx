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

interface LiveSubstitution {
  playerOffId: string;
  playerOnId: string;
  periodNumber: number;
}

export const GameDayView: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [selectedTeamNumber, setSelectedTeamNumber] = useState<number>(1);
  const [currentPeriodIndex, setCurrentPeriodIndex] = useState(0);
  const [matchEvents, setMatchEvents] = useState<MatchEvent[]>([]);
  const [liveSubstitutions, setLiveSubstitutions] = useState<LiveSubstitution[]>([]);
  
  const { 
    data: event, 
    error: eventError, 
    isLoading: eventLoading,
    refetch: refetchEvent
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
    data: allEventSelections, 
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
          performance_categories (
            id,
            name
          )
        `)
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

  // Fetch team for logo/badge
  const { data: team } = useQuery({
    queryKey: ['team', event?.team_id],
    enabled: !!event?.team_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, logo_url')
        .eq('id', event.team_id)
        .single();
      if (error) throw error;
      return data;
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

  // Get unique team numbers with their performance category names
  const teamsInfo = useMemo(() => {
    if (!allEventSelections) return [];
    
    const teamMap = new Map<number, { teamNumber: number; categoryName?: string }>();
    
    allEventSelections.forEach(sel => {
      const teamNum = sel.team_number || 1;
      if (!teamMap.has(teamNum)) {
        const category = sel.performance_categories as any;
        teamMap.set(teamNum, {
          teamNumber: teamNum,
          categoryName: category?.name
        });
      }
    });
    
    return Array.from(teamMap.values()).sort((a, b) => a.teamNumber - b.teamNumber);
  }, [allEventSelections]);

  // Filter event selections by selected team number
  const eventSelections = useMemo(() => {
    if (!allEventSelections) return [];
    return allEventSelections.filter(sel => (sel.team_number || 1) === selectedTeamNumber);
  }, [allEventSelections, selectedTeamNumber]);

  // Reset period index when switching teams
  useEffect(() => {
    setCurrentPeriodIndex(0);
  }, [selectedTeamNumber]);

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

  // Get all player IDs that belong to the current team (from all periods)
  const currentTeamPlayerIds = useMemo(() => {
    const playerIds = new Set<string>();
    eventSelections.forEach(sel => {
      const positions = sel.player_positions as any[];
      if (positions) {
        positions.forEach(pos => {
          if (pos.playerId) playerIds.add(pos.playerId);
        });
      }
      const subs = sel.substitute_players as string[];
      if (subs) {
        subs.forEach(id => {
          if (id) playerIds.add(id);
        });
      }
    });
    return playerIds;
  }, [eventSelections]);

  // Filter match events by current team's players
  const filteredMatchEvents = useMemo(() => {
    return matchEvents.filter(evt => {
      // Check if player_id belongs to current team
      return evt.player_id && currentTeamPlayerIds.has(evt.player_id);
    });
  }, [matchEvents, currentTeamPlayerIds]);

  const handleEventCreated = async (newEvent: MatchEvent) => {
    // Always add to UI immediately
    setMatchEvents(prev => [...prev, newEvent]);
    
    // Stats update and score calculation in background
    setTimeout(async () => {
      try {
        const { playerStatsService } = await import('@/services/playerStatsService');
        await playerStatsService.updateEventPlayerStats(eventId!);
        
        // Auto-update score if it's a goal
        if (newEvent.event_type === 'goal') {
          const calculatedScore = await matchEventService.calculateEventScore(eventId!);
          
          const { data: currentEvent } = await supabase
            .from('events')
            .select('scores')
            .eq('id', eventId)
            .single();
          
          const currentScores = (currentEvent?.scores && typeof currentEvent.scores === 'object') 
            ? currentEvent.scores as Record<string, any>
            : {};
          const updatedScores: Record<string, any> = { ...currentScores };
          
          if (calculatedScore.team_1 !== undefined) {
            updatedScores.team_1 = calculatedScore.team_1;
          }
          if (calculatedScore.team_2 !== undefined) {
            updatedScores.team_2 = calculatedScore.team_2;
          }
          
          await supabase
            .from('events')
            .update({ scores: updatedScores })
            .eq('id', eventId);
            
          refetchEvent();
        }
      } catch (error) {
        console.error('Background stats update failed:', error);
      }
    }, 100);
  };

  const handleEventDelete = async (eventToDelete: MatchEvent) => {
    try {
      await matchEventService.deleteMatchEvent(eventToDelete.id);
      setMatchEvents(prev => prev.filter(e => e.id !== eventToDelete.id));
      toast.success('Event deleted');
      
      const { playerStatsService } = await import('@/services/playerStatsService');
      await playerStatsService.updateEventPlayerStats(eventId!);
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
  };

  const handleSubstitution = (playerOffId: string, playerOnId: string) => {
    if (!eventSelections[currentPeriodIndex]) return;
    setLiveSubstitutions(prev => [...prev, {
      playerOffId,
      playerOnId,
      periodNumber: eventSelections[currentPeriodIndex].period_number
    }]);
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
  if (!allEventSelections || allEventSelections.length === 0) {
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

  // Handle no selections for selected team (shouldn't happen but safety check)
  if (eventSelections.length === 0) {
    return (
      <div className="game-day-container">
        <div className="flex flex-col items-center justify-center h-full text-center px-4 gap-4">
          <p className="text-sm font-medium">No data found for selected team.</p>
          <Button variant="outline" size="sm" onClick={() => setSelectedTeamNumber(teamsInfo[0]?.teamNumber || 1)}>
            Select Team
          </Button>
        </div>
      </div>
    );
  }

  const currentSelection = eventSelections[currentPeriodIndex];
  const totalPeriods = eventSelections.length;
  const periodDuration = currentSelection?.duration_minutes || 25;

  // Parse positions from player_positions JSON with enriched data
  let positions = currentSelection?.player_positions 
    ? (() => {
        const playerPositions = currentSelection.player_positions;
        const previousSelection = currentPeriodIndex > 0 ? eventSelections[currentPeriodIndex - 1] : null;
        const previousPositions = previousSelection?.player_positions || [];
        
        const previousPositionMap = new Map();
        if (Array.isArray(previousPositions)) {
          previousPositions.forEach((pos: any) => {
            const posKey = `${pos.positionGroup}-${Math.round(pos.x)}-${Math.round(pos.y)}`;
            previousPositionMap.set(posKey, pos.playerId);
          });
        }
        
        if (Array.isArray(playerPositions)) {
          return playerPositions.map((pos: any) => {
            const playerInfo = playerMap.get(pos.playerId);
            
            const posKey = `${pos.positionGroup}-${Math.round(pos.x)}-${Math.round(pos.y)}`;
            const previousPlayerId = previousPositionMap.get(posKey);
            const wasReplaced = previousPlayerId && previousPlayerId !== pos.playerId;
            
            const isGoalkeeper = pos.positionGroup === 'goalkeeper';
            const adjustedY = isGoalkeeper ? pos.y : Math.min(pos.y + 8, 92);
            
            return {
              playerId: pos.playerId,
              playerName: playerInfo?.name || pos.playerName || 'Unknown',
              squadNumber: playerInfo?.squadNumber ?? pos.squadNumber ?? 0,
              position: pos.positionName || pos.position || 'Unknown',
              positionGroup: pos.positionGroup || 'midfielder',
              x: pos.x || 50,
              y: adjustedY || 50,
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

  // Apply live substitutions for the current period
  const currentPeriodLiveSubstitutions = liveSubstitutions.filter(
    sub => sub.periodNumber === currentSelection.period_number
  );

  currentPeriodLiveSubstitutions.forEach(sub => {
    const indexToReplace = positions.findIndex(p => p.playerId === sub.playerOffId);
    if (indexToReplace !== -1) {
      const playerOnInfo = playerMap.get(sub.playerOnId);
      positions[indexToReplace] = {
        ...positions[indexToReplace],
        playerId: sub.playerOnId,
        playerName: playerOnInfo?.name || 'Unknown',
        squadNumber: playerOnInfo?.squadNumber || 0,
      };
    }
  });

  // Collect ALL substitute players from all periods of selected team
  const allSubstituteIdsSet = new Set<string>();
  const substituteReplacementMap = new Map<string, string>();

  eventSelections.forEach((sel: any, index: number) => {
    const subs = (sel.substitute_players as string[] | null) || [];
    subs.forEach((id) => {
      if (id) allSubstituteIdsSet.add(id);
    });

    if (index > 0) {
      const prevSel = eventSelections[index - 1];
      const prevPositions = (prevSel.player_positions as any[]) || [];
      const currPositions = (sel.player_positions as any[]) || [];

      currPositions.forEach((currPos: any) => {
        const matchingPrevPos = prevPositions.find((prevPos: any) => 
          prevPos.positionGroup === currPos.positionGroup &&
          Math.abs(prevPos.x - currPos.x) < 5 &&
          Math.abs(prevPos.y - currPos.y) < 10
        );

        if (matchingPrevPos && matchingPrevPos.playerId !== currPos.playerId) {
          substituteReplacementMap.set(currPos.playerId, matchingPrevPos.playerId);
        }
      });
    }
  });

  const allSubstituteIds = Array.from(allSubstituteIdsSet);

  const liveSubsOnIds = new Set(
    currentPeriodLiveSubstitutions.map(sub => sub.playerOnId)
  );
  
  const liveSubsOffIds = new Set(
    currentPeriodLiveSubstitutions.map(sub => sub.playerOffId)
  );

  const substitutes = allSubstituteIds
    .filter((subId: string) => {
      const isOnPitch = positions.some((p) => p.playerId === subId);
      const cameOnViaLiveSub = liveSubsOnIds.has(subId);
      return !isOnPitch && !cameOnViaLiveSub;
    })
    .map((subId: string) => {
      const playerInfo = playerMap.get(subId);
      const replacedPlayerId = substituteReplacementMap.get(subId);
      const replacedPlayerInfo = replacedPlayerId ? playerMap.get(replacedPlayerId) : null;

      return {
        id: subId,
        name: playerInfo?.name || 'Unknown',
        squad_number: playerInfo?.squadNumber || 0,
        position: 'SUB',
        isUsed: false,
        replacedPlayerName: replacedPlayerInfo?.name,
      };
    });

  currentPeriodLiveSubstitutions.forEach(sub => {
    const playerOffInfo = playerMap.get(sub.playerOffId);
    if (playerOffInfo && !substitutes.some(s => s.id === sub.playerOffId)) {
      substitutes.push({
        id: sub.playerOffId,
        name: playerOffInfo.name,
        squad_number: playerOffInfo.squadNumber || 0,
        position: 'SUB',
        isUsed: true,
        replacedPlayerName: undefined,
      });
    }
  });

  const handlePlayerLongPress = (playerId: string) => {
    toast.info('Long press a player on the pitch to log events');
  };

  // Get display name for selected team
  const selectedTeamInfo = teamsInfo.find(t => t.teamNumber === selectedTeamNumber);
  const teamDisplayName = selectedTeamInfo?.categoryName || `Team ${selectedTeamNumber}`;

  return (
    <div className="game-day-container">
      {/* Compact Header */}
      <div className="game-day-header-compact">
        {/* Row 1: back + team badge + title/opponent + team switcher + controls */}
        <div className="flex items-center justify-between px-2 py-1 gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate('/calendar')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex-1 flex items-center justify-center gap-2">
            {team?.logo_url && (
              <img 
                src={team.logo_url} 
                alt={team.name}
                className="h-8 w-8 object-contain rounded"
              />
            )}
            <div className="text-center">
              <h1 className="text-sm font-bold leading-tight truncate">
                {event.title}
              </h1>
              {event.opponent && (
                <p className="text-xs font-semibold text-foreground truncate">
                  vs {event.opponent}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant={isRunning ? "ghost" : "default"}
              className="h-10 w-10"
              onClick={isRunning ? pause : start}
            >
              {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
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

        {/* Row 2: Team switcher + timer/score */}
        <div className="flex items-center justify-between px-2 pb-1">
          {/* Team Switcher (when multiple teams) */}
          {teamsInfo.length > 1 ? (
            <div className="flex items-center gap-1">
              {teamsInfo.map(teamInfo => (
                <Button
                  key={teamInfo.teamNumber}
                  variant={teamInfo.teamNumber === selectedTeamNumber ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTeamNumber(teamInfo.teamNumber)}
                  className="h-6 text-[10px] px-2"
                >
                  {teamInfo.categoryName || `T${teamInfo.teamNumber}`}
                </Button>
              ))}
            </div>
          ) : (
            <div className="text-[10px] text-muted-foreground">
              Period {currentSelection.period_number}
              {currentSelection.formation && ` • ${currentSelection.formation}`}
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className="match-timer-compact text-xl leading-none">
              {displayTime}
            </div>
            {event.scores && (
              <div className="match-score-compact text-sm leading-none">
                {(event.scores as any)?.home || (event.scores as any)?.team_1 || 0} - {(event.scores as any)?.away || (event.scores as any)?.team_2 || 0}
              </div>
            )}
          </div>
        </div>

        {/* Row 3: Period info (when multiple teams) */}
        {teamsInfo.length > 1 && (
          <div className="px-2 pb-1">
            <div className="text-[10px] text-muted-foreground">
              Period {currentSelection.period_number}
              {currentSelection.formation && ` • ${currentSelection.formation}`}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="game-day-content">
        {/* Compact Timeline */}
        <div className="px-2 py-1">
          <GameDayTimeline
            matchEvents={filteredMatchEvents}
            periodDuration={periodDuration}
            totalPeriods={totalPeriods}
            compact={true}
            onEventDelete={handleEventDelete}
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
              substitutes={substitutes}
              matchEvents={filteredMatchEvents}
              onEventCreated={handleEventCreated}
              onSubstitution={handleSubstitution}
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

        {/* Substitutes - no extra wrapper, just the bench */}
        {substitutes.length > 0 && (
          <GameDaySubstituteBench
            substitutes={substitutes}
            onPlayerLongPress={handlePlayerLongPress}
          />
        )}
      </div>
    </div>
  );
};
