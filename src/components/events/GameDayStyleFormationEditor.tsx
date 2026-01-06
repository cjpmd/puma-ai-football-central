import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  rectIntersection,
  pointerWithin,
  type CollisionDetection,
  type UniqueIdentifier
} from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, ChevronLeft, ChevronRight, Clock, Trash2 } from 'lucide-react';
import { PlayerIcon } from './PlayerIcon';
import { PositionSlot } from './PositionSlot';
import { SubstituteBench } from './SubstituteBench';
import { usePositionAbbreviations } from '@/hooks/usePositionAbbreviations';
import { SquadPlayer, FormationPeriod, PositionSlot as PositionSlotType } from '@/types/teamSelection';
import { getFormationsByFormat } from '@/utils/formationUtils';
import { useMobileDetection } from '@/hooks/useMobileDetection';

interface GameDayStyleFormationEditorProps {
  squadPlayers: SquadPlayer[];
  periods: FormationPeriod[];
  gameFormat: string;
  globalCaptainId?: string;
  nameDisplayOption?: 'surname' | 'firstName' | 'fullName' | 'initials';
  onPeriodsChange: (periods: FormationPeriod[]) => void;
  onCaptainChange: (captainId: string) => void;
  gameDuration?: number;
  eventType?: string;
  isPositionsLocked?: boolean;
}

export const GameDayStyleFormationEditor: React.FC<GameDayStyleFormationEditorProps> = ({
  squadPlayers,
  periods,
  gameFormat,
  globalCaptainId,
  nameDisplayOption = 'surname',
  onPeriodsChange,
  onCaptainChange,
  gameDuration = 50,
  isPositionsLocked = false,
}) => {
  const [draggedPlayer, setDraggedPlayer] = useState<SquadPlayer | null>(null);
  const [activePeriodIndex, setActivePeriodIndex] = useState(0);
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);
  const { positions } = usePositionAbbreviations(gameFormat);
  const isMobile = useMobileDetection();
  const pitchRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 3 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    })
  );

  const collisionDetectionStrategy: CollisionDetection = (args) => {
    const getType = (id: UniqueIdentifier) => {
      const container = args.droppableContainers.find(c => c.id === id);
      return container?.data?.current?.type as string | undefined;
    };

    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      const positionFirst = pointerCollisions.filter(c => 
        getType(c.id) === 'position' || (typeof c.id === 'string' && String(c.id).includes('-position-'))
      );
      return positionFirst.length > 0 ? positionFirst : pointerCollisions;
    }

    const rectCollisions = rectIntersection(args);
    if (rectCollisions.length > 0) {
      const positionFirst = rectCollisions.filter(c => 
        getType(c.id) === 'position' || (typeof c.id === 'string' && String(c.id).includes('-position-'))
      );
      return positionFirst.length > 0 ? positionFirst : rectCollisions;
    }

    return closestCenter(args);
  };

  const gameFormatFormations = getFormationsByFormat(gameFormat as any);
  const currentPeriod = periods[activePeriodIndex];

  // Auto-sync existing periods to updated formation coordinates and abbreviations
  useEffect(() => {
    let needsUpdate = false;
    const updatedPeriods = periods.map(period => {
      if (period.formation && (!period.positions || period.positions.length === 0)) {
        needsUpdate = true;
        return { ...period, positions: createPositionSlots(period.formation) };
      }
      
      if (period.formation && period.positions.length > 0) {
        const templatePositions = createPositionSlots(period.formation);
        const syncedPositions = period.positions.map(existingPos => {
          const matchingTemplate = templatePositions.find(
            template => template.positionName === existingPos.positionName
          );
          // Also sync if abbreviation is wrong (fix for "Mi" showing instead of "ML")
          const expectedAbbr = matchingTemplate?.abbreviation || getDefaultAbbreviation(existingPos.positionName);
          if (matchingTemplate && (
            existingPos.x !== matchingTemplate.x || 
            existingPos.y !== matchingTemplate.y ||
            existingPos.abbreviation !== expectedAbbr
          )) {
            needsUpdate = true;
            return {
              ...existingPos,
              x: matchingTemplate.x,
              y: matchingTemplate.y,
              abbreviation: expectedAbbr,
              positionGroup: matchingTemplate.positionGroup
            };
          }
          return existingPos;
        });
        
        if (needsUpdate) {
          return { ...period, positions: syncedPositions };
        }
      }
      
      return period;
    });

    if (needsUpdate) {
      onPeriodsChange(updatedPeriods);
    }
  }, [periods, gameFormat]);

  // Calculate time ranges for each period
  const calculateTimeRange = (periodIndex: number): string => {
    let startTime = 0;
    for (let i = 0; i < periodIndex; i++) {
      startTime += periods[i]?.duration || 0;
    }
    const endTime = startTime + (periods[periodIndex]?.duration || 0);
    return `${startTime}-${endTime}'`;
  };

  const getPositionGroup = (positionName: string): 'goalkeeper' | 'defender' | 'midfielder' | 'forward' => {
    if (positionName.toLowerCase().includes('goalkeeper')) return 'goalkeeper';
    if (positionName.toLowerCase().includes('defender')) return 'defender';
    if (positionName.toLowerCase().includes('midfielder')) return 'midfielder';
    if (positionName.toLowerCase().includes('striker') || positionName.toLowerCase().includes('attacking')) return 'forward';
    return 'midfielder';
  };

  const getPositionGroupColor = (positionName: string): string => {
    const pos = positionName?.toLowerCase() || '';
    if (pos.includes('goalkeeper') || pos === 'gk') {
      return 'border-yellow-400 bg-yellow-400/20';
    } else if (pos.includes('defender') || pos.startsWith('d')) {
      return 'border-blue-400 bg-blue-400/20';
    } else if (pos.includes('midfielder') || pos.startsWith('m') || pos.includes('mid')) {
      return 'border-green-400 bg-green-400/20';
    } else {
      return 'border-red-400 bg-red-400/20';
    }
  };

  const createPositionSlots = (formationId: string): PositionSlotType[] => {
    const formationConfig = gameFormatFormations.find(f => f.id === formationId);
    if (!formationConfig) return [];

    return formationConfig.positions.map((pos, index) => {
      const positionData = positions.find(p => p.positionName === pos.position);
      return {
        id: `position-${Math.random().toString(36).substr(2, 9)}`,
        positionName: pos.position,
        abbreviation: positionData?.abbreviation || getDefaultAbbreviation(pos.position),
        positionGroup: positionData?.positionGroup || getPositionGroup(pos.position),
        x: pos.x,
        y: pos.y,
        playerId: undefined
      };
    });
  };

  const getDefaultAbbreviation = (positionName: string): string => {
    const positionMap: Record<string, string> = {
      'Goalkeeper': 'GK',
      'Defender Left': 'DL',
      'Defender Right': 'DR', 
      'Defender Centre': 'DC',
      'Defender Centre Left': 'DCL',
      'Defender Centre Right': 'DCR',
      'Midfielder Left': 'ML',
      'Midfielder Right': 'MR',
      'Midfielder Centre': 'MC',
      'Midfielder Centre Left': 'MCL',
      'Midfielder Centre Right': 'MCR',
      'Midfielder Defensive': 'DM',
      'Midfielder Attacking': 'AM',
      'Attacking Midfielder Centre': 'AMC',
      'Attacking Midfielder Left': 'AML',
      'Attacking Midfielder Right': 'AMR',
      'Midfielder Attacking Centre': 'AMC',
      'Midfielder Attacking Left': 'AML',
      'Midfielder Attacking Right': 'AMR',
      'Striker Centre': 'STC',
      'Striker Left': 'STL',
      'Striker Right': 'STR',
      'Striker Centre Left': 'SCL',
      'Striker Centre Right': 'SCR',
      'Forward Left': 'FL',
      'Forward Centre': 'FC',
      'Forward Right': 'FR',
      'Wing Left': 'LW',
      'Wing Right': 'RW',
      'Winger Left': 'LW',
      'Winger Right': 'RW',
    };
    return positionMap[positionName] || positionName.slice(0, 3).toUpperCase();
  };

  const preservePlayerAssignments = (oldPositions: PositionSlotType[], newPositions: PositionSlotType[]): PositionSlotType[] => {
    const updatedPositions = [...newPositions];
    
    oldPositions.forEach(oldPos => {
      if (!oldPos.playerId) return;
      
      let matchIndex = updatedPositions.findIndex(newPos => 
        newPos.positionName === oldPos.positionName && !newPos.playerId
      );
      
      if (matchIndex === -1) {
        const oldPosGroup = getPositionGroup(oldPos.positionName);
        matchIndex = updatedPositions.findIndex(newPos => 
          getPositionGroup(newPos.positionName) === oldPosGroup && !newPos.playerId
        );
      }
      
      if (matchIndex !== -1) {
        updatedPositions[matchIndex] = { ...updatedPositions[matchIndex], playerId: oldPos.playerId };
      }
    });
    
    return updatedPositions;
  };

  const addPeriod = () => {
    const newPeriodNumber = periods.length + 1;
    const lastPeriod = periods[periods.length - 1];
    const formationId = lastPeriod?.formation || gameFormatFormations[0]?.id || '1-2-3-1';
    const freshPositions = createPositionSlots(formationId);
    
    if (!freshPositions || freshPositions.length === 0) return;
    
    const positionsWithPlayers = lastPeriod 
      ? preservePlayerAssignments(lastPeriod.positions, freshPositions)
      : freshPositions;
    
    const newPeriod: FormationPeriod = {
      id: `period-${newPeriodNumber}-${Date.now()}`,
      periodNumber: newPeriodNumber,
      formation: formationId,
      duration: 8,
      positions: positionsWithPlayers,
      substitutes: lastPeriod ? [...lastPeriod.substitutes] : [],
      captainId: globalCaptainId
    };

    onPeriodsChange([...periods, newPeriod]);
    setActivePeriodIndex(periods.length);
  };

  const deletePeriod = (periodId: string) => {
    if (periods.length <= 1) return;
    const periodIndex = periods.findIndex(p => p.id === periodId);
    const updatedPeriods = periods.filter(period => period.id !== periodId);
    onPeriodsChange(updatedPeriods);
    if (activePeriodIndex >= updatedPeriods.length) {
      setActivePeriodIndex(updatedPeriods.length - 1);
    } else if (activePeriodIndex > periodIndex) {
      setActivePeriodIndex(activePeriodIndex - 1);
    }
  };

  const updatePeriodDuration = (periodId: string, duration: number) => {
    const updatedPeriods = periods.map(period => 
      period.id === periodId ? { ...period, duration } : period
    );
    onPeriodsChange(updatedPeriods);
  };

  const updatePeriodFormation = (periodId: string, formation: string) => {
    const updatedPeriods = periods.map(period => {
      if (period.id === periodId) {
        const newPositions = createPositionSlots(formation);
        const preservedPositions = preservePlayerAssignments(period.positions, newPositions);
        
        const assignedPlayerIds = new Set(preservedPositions.filter(p => p.playerId).map(p => p.playerId));
        const previousPlayerIds = period.positions.filter(p => p.playerId).map(p => p.playerId!);
        const orphanedPlayerIds = previousPlayerIds.filter(id => !assignedPlayerIds.has(id));
        
        const updatedSubstitutes = [
          ...period.substitutes.filter(id => !orphanedPlayerIds.includes(id)),
          ...orphanedPlayerIds
        ];
        
        return { ...period, formation, positions: preservedPositions, substitutes: updatedSubstitutes };
      }
      return period;
    });
    
    onPeriodsChange(updatedPeriods);
  };

  // Swipe handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    
    if (Math.abs(diff) > 30) {
      if (diff > 0 && activePeriodIndex < periods.length - 1) {
        setActivePeriodIndex(activePeriodIndex + 1);
      } else if (diff < 0 && activePeriodIndex > 0) {
        setActivePeriodIndex(activePeriodIndex - 1);
      }
    }
  }, [activePeriodIndex, periods.length]);

  const handleDragStart = (event: DragStartEvent) => {
    if (isPositionsLocked) {
      setDraggedPlayer(null);
      return;
    }
    
    document.documentElement.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    
    const dragId = event.active.id as string;
    let playerId: string;
    
    if (dragId.includes('|')) {
      const parts = dragId.split('|');
      playerId = parts[parts.length - 1];
    } else {
      playerId = dragId;
    }
    
    const player = squadPlayers.find(p => p.id === playerId);
    if (player) setDraggedPlayer(player);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (isPositionsLocked) {
      setDraggedPlayer(null);
      return;
    }
    
    const { active, over } = event;
    const playerBeingDragged = draggedPlayer;
    setDraggedPlayer(null);
    
    document.documentElement.style.removeProperty('cursor');
    document.body.style.removeProperty('user-select');
    
    if (!over || !playerBeingDragged || !currentPeriod) return;

    const overId = over.id as string;
    const playerId = playerBeingDragged.id;

    if (overId.includes('-position-')) {
      const parts = overId.split('-position-');
      const positionIndex = parseInt(parts[1]);
      movePlayerToPosition(playerId, currentPeriod.id, positionIndex);
    } else if (overId.startsWith('substitutes-')) {
      movePlayerToSubstitutes(playerId, currentPeriod.id);
    }
  };

  const movePlayerToPosition = (playerId: string, targetPeriodId: string, positionIndex: number) => {
    const updatedPeriods = periods.map(period => {
      if (period.id === targetPeriodId) {
        const newPositions = [...period.positions];
        const newSubstitutes = [...period.substitutes];
        
        const displacedPlayerId = newPositions[positionIndex]?.playerId;
        if (displacedPlayerId && displacedPlayerId !== playerId) {
          if (!newSubstitutes.includes(displacedPlayerId)) {
            newSubstitutes.push(displacedPlayerId);
          }
        }
        
        const subIndex = newSubstitutes.indexOf(playerId);
        if (subIndex > -1) newSubstitutes.splice(subIndex, 1);
        
        newPositions.forEach(pos => {
          if (pos.playerId === playerId) pos.playerId = undefined;
        });
        
        if (newPositions[positionIndex]) {
          newPositions[positionIndex].playerId = playerId;
        }
        
        return { ...period, positions: newPositions, substitutes: newSubstitutes };
      }
      return period;
    });
    
    onPeriodsChange(updatedPeriods);
  };

  const movePlayerToSubstitutes = (playerId: string, targetPeriodId: string) => {
    const updatedPeriods = periods.map(period => {
      if (period.id === targetPeriodId) {
        const newPositions = [...period.positions];
        const newSubstitutes = [...period.substitutes];
        
        newPositions.forEach(pos => {
          if (pos.playerId === playerId) pos.playerId = undefined;
        });
        
        const existingSubIndex = newSubstitutes.indexOf(playerId);
        if (existingSubIndex > -1) newSubstitutes.splice(existingSubIndex, 1);
        newSubstitutes.push(playerId);
        
        return { ...period, positions: newPositions, substitutes: newSubstitutes };
      }
      return period;
    });
    
    onPeriodsChange(updatedPeriods);
  };

  // Get substitute players for current period (excluding players already on pitch)
  const getSubstitutePlayers = (): SquadPlayer[] => {
    if (!currentPeriod) return [];
    
    // Get IDs of players currently on the pitch
    const onPitchPlayerIds = new Set(
      currentPeriod.positions
        .filter(pos => pos.playerId)
        .map(pos => pos.playerId)
    );
    
    // Return squad players who are in substitutes AND not on pitch
    return currentPeriod.substitutes
      .filter(id => !onPitchPlayerIds.has(id))
      .map(id => squadPlayers.find(p => p.id === id))
      .filter((p): p is SquadPlayer => p !== undefined);
  };

  // Calculate playing time summary for all players
  const calculatePlayingTimeSummary = (): { player: SquadPlayer; minutes: number }[] => {
    const playerTimes: Record<string, number> = {};
    
    // Initialize all squad players with 0 minutes
    squadPlayers.forEach(player => {
      playerTimes[player.id] = 0;
    });
    
    // Sum up minutes from each period where player is on pitch
    periods.forEach(period => {
      period.positions.forEach(position => {
        if (position.playerId) {
          playerTimes[position.playerId] = (playerTimes[position.playerId] || 0) + period.duration;
        }
      });
    });
    
    // Convert to array with player objects
    return squadPlayers.map(player => ({
      player,
      minutes: playerTimes[player.id] || 0
    })).sort((a, b) => b.minutes - a.minutes);
  };

  // Get player display name
  const getPlayerDisplayName = (player: SquadPlayer): string => {
    const name = player.name || '';
    switch (nameDisplayOption) {
      case 'firstName':
        return name.split(' ')[0] || name;
      case 'surname':
        const parts = name.split(' ');
        return parts[parts.length - 1] || name;
      case 'initials':
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
      default:
        return name;
    }
  };

  // Auto-create first period if none exist
  useEffect(() => {
    if (periods.length === 0 && gameFormatFormations.length > 0) {
      addPeriod();
    }
  }, [gameFormatFormations]);

  if (!currentPeriod) return null;

  const playingTimeSummary = calculatePlayingTimeSummary();
  const totalGameMinutes = periods.reduce((sum, p) => sum + p.duration, 0);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      modifiers={[snapCenterToCursor]}
    >
      <div 
        className="flex flex-col h-full overflow-hidden w-full max-w-full"
        onTouchStart={isMobile ? handleTouchStart : undefined}
        onTouchEnd={isMobile ? handleTouchEnd : undefined}
      >
        {/* Formation Selector - Ultra Compact */}
        <div className={`flex items-center justify-between px-1.5 border-b shrink-0 ${isMobile ? 'py-0.5' : 'py-1'}`}>
          <Select
            value={currentPeriod.formation}
            onValueChange={(value) => updatePeriodFormation(currentPeriod.id, value)}
            disabled={isPositionsLocked}
          >
            <SelectTrigger className={`${isMobile ? 'w-20 h-5 text-[9px]' : 'w-28 h-6 text-xs'}`}>
              <SelectValue placeholder="Formation" />
            </SelectTrigger>
            <SelectContent>
              {gameFormatFormations.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className={`text-muted-foreground ${isMobile ? 'text-[9px]' : 'text-xs'}`}>
            {activePeriodIndex + 1}/{periods.length}
          </div>
        </div>

        {/* Pitch Area - Fill available space */}
        <div 
          ref={pitchRef}
          className="flex-1 min-h-0 relative overflow-hidden w-full max-w-full"
        >
          <div className="formation-pitch w-full h-full">
            <div className="goal-box-top"></div>
            <div className="goal-box-bottom"></div>
            
            {currentPeriod.positions.map((position, index) => {
              const player = squadPlayers.find(p => p.id === position.playerId);
              const isCaptain = player?.id === globalCaptainId;
              const positionGroupColor = getPositionGroupColor(position.positionName);
              
              return (
                <div key={`${currentPeriod.id}-position-${index}`}>
                  {/* Drop zone for position */}
                  <PositionSlot
                    id={`${currentPeriod.id}-position-${index}`}
                    position={position}
                    player={player}
                    isCaptain={isCaptain}
                    nameDisplayOption={nameDisplayOption}
                  />
                  
                  {/* Render draggable player icon on top of position slot */}
                  {player && (
                    <div
                      className="absolute"
                      style={{
                        left: `${position.x}%`,
                        top: `${position.y}%`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 20,
                      }}
                    >
                      <div className={`rounded-full border-2 ${positionGroupColor} p-0.5`}>
                        <PlayerIcon
                          player={player}
                          isCaptain={isCaptain}
                          nameDisplayOption={nameDisplayOption}
                          isCircular={true}
                          dragId={isPositionsLocked ? undefined : `${currentPeriod.id}|position|${player.id}`}
                          positionAbbreviation={position.abbreviation}
                          showPositionLabel={true}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Period Tabs - Ultra Compact on Mobile */}
        <div className={`shrink-0 border-t bg-muted/30 px-1.5 ${isMobile ? 'py-0.5' : 'py-1.5'}`}>
          <div className="flex items-center gap-0.5">
            {/* Left Arrow */}
            <Button
              variant="ghost"
              size="sm"
              className={`${isMobile ? 'h-5 w-5' : 'h-7 w-7'} p-0 shrink-0`}
              onClick={() => setActivePeriodIndex(Math.max(0, activePeriodIndex - 1))}
              disabled={activePeriodIndex === 0}
            >
              <ChevronLeft className={isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
            </Button>
            
            {/* Period Buttons */}
            <div className="flex-1 flex gap-0.5 overflow-x-auto scrollbar-hide">
              {periods.map((period, index) => (
                <Popover 
                  key={period.id} 
                  open={editingPeriodId === period.id}
                  onOpenChange={(open) => setEditingPeriodId(open ? period.id : null)}
                >
                  <PopoverTrigger asChild>
                    <button
                      className={`period-time-button flex-1 min-w-[40px] ${isMobile ? 'text-[10px] py-0.5' : 'text-xs py-1'} ${index === activePeriodIndex ? 'active' : ''}`}
                      onClick={() => setActivePeriodIndex(index)}
                    >
                      {calculateTimeRange(index)}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-3" align="center">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Duration</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={period.duration}
                          onChange={(e) => updatePeriodDuration(period.id, parseInt(e.target.value) || 1)}
                          className="h-8 w-20 text-center"
                          min={1}
                          max={45}
                        />
                        <span className="text-sm text-muted-foreground">mins</span>
                      </div>
                      {periods.length > 1 && (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            deletePeriod(period.id);
                            setEditingPeriodId(null);
                          }}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete Period
                        </Button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              ))}
            </div>

            {/* Right Arrow */}
            <Button
              variant="ghost"
              size="sm"
              className={`${isMobile ? 'h-5 w-5' : 'h-7 w-7'} p-0 shrink-0`}
              onClick={() => setActivePeriodIndex(Math.min(periods.length - 1, activePeriodIndex + 1))}
              disabled={activePeriodIndex === periods.length - 1}
            >
              <ChevronRight className={isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
            </Button>

            {/* Add Period Button */}
            <Button
              variant="outline"
              size="sm"
              className={`${isMobile ? 'h-5 w-5' : 'h-7 w-7'} p-0 shrink-0`}
              onClick={addPeriod}
            >
              <Plus className={isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
            </Button>
          </div>
        </div>

        {/* Substitutes Bench - Ultra Compact on Mobile */}
        <div className={`shrink-0 px-1.5 border-t ${isMobile ? 'py-0.5' : 'py-1'}`}>
          <div className={`font-medium text-muted-foreground ${isMobile ? 'text-[9px] mb-0' : 'text-xs mb-1'}`}>Subs</div>
          <SubstituteBench
            id={`substitutes-${currentPeriod.id}`}
            substitutes={getSubstitutePlayers()}
            globalCaptainId={globalCaptainId}
            nameDisplayOption={nameDisplayOption}
            compact
          />
        </div>

        {/* Playing Time Summary - Ultra Compact on Mobile */}
        <div className={`shrink-0 border-t bg-muted/20 px-1.5 ${isMobile ? 'py-1' : 'py-1.5'}`}>
          <div className={`font-medium text-muted-foreground flex items-center gap-0.5 ${isMobile ? 'text-[10px] mb-0.5' : 'text-xs mb-1'}`}>
            <Clock className={isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
            Time ({totalGameMinutes}')
          </div>
          <div className="flex gap-0.5 overflow-x-auto scrollbar-hide">
            {playingTimeSummary.map(({ player, minutes }) => (
              <div 
                key={player.id}
                className={`flex items-center gap-0.5 rounded-full whitespace-nowrap ${isMobile ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'} ${
                  minutes === 0 
                    ? 'bg-destructive/10 text-destructive' 
                    : minutes >= totalGameMinutes 
                      ? 'bg-primary/10 text-primary' 
                      : 'bg-muted'
                }`}
              >
                <span className="font-medium">{getPlayerDisplayName(player)}</span>
                <span className="text-muted-foreground">{minutes}'</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay dropAnimation={null}>
        {draggedPlayer ? (
          <PlayerIcon
            player={draggedPlayer}
            isCaptain={draggedPlayer.id === globalCaptainId}
            nameDisplayOption={nameDisplayOption}
            isCircular={true}
            isDragging
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};