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

  // Auto-sync existing periods to updated formation coordinates
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
          if (matchingTemplate && (existingPos.x !== matchingTemplate.x || existingPos.y !== matchingTemplate.y)) {
            needsUpdate = true;
            return {
              ...existingPos,
              x: matchingTemplate.x,
              y: matchingTemplate.y,
              abbreviation: matchingTemplate.abbreviation,
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
      'Attacking Midfielder Centre': 'AMC',
      'Attacking Midfielder Left': 'AML',
      'Attacking Midfielder Right': 'AMR',
      'Striker Centre': 'STC',
      'Striker Left': 'STL',
      'Striker Right': 'STR',
      'Striker Centre Left': 'SCL',
      'Striker Centre Right': 'SCR'
    };
    return positionMap[positionName] || positionName.slice(0, 2).toUpperCase();
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
    
    if (Math.abs(diff) > 50) {
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

  // Get substitute players for current period
  const getSubstitutePlayers = (): SquadPlayer[] => {
    if (!currentPeriod) return [];
    return currentPeriod.substitutes
      .map(id => squadPlayers.find(p => p.id === id))
      .filter((p): p is SquadPlayer => p !== undefined);
  };

  // Auto-create first period if none exist
  useEffect(() => {
    if (periods.length === 0 && gameFormatFormations.length > 0) {
      addPeriod();
    }
  }, [gameFormatFormations]);

  if (!currentPeriod) return null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      modifiers={[snapCenterToCursor]}
    >
      <div className="flex flex-col h-full max-h-[calc(100vh-280px)] overflow-hidden">
        {/* Formation Selector */}
        <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
          <Select
            value={currentPeriod.formation}
            onValueChange={(value) => updatePeriodFormation(currentPeriod.id, value)}
            disabled={isPositionsLocked}
          >
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue placeholder="Formation" />
            </SelectTrigger>
            <SelectContent>
              {gameFormatFormations.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="text-xs text-muted-foreground">
            Period {activePeriodIndex + 1} of {periods.length}
          </div>
        </div>

        {/* Pitch Area */}
        <div 
          ref={pitchRef}
          className="flex-1 min-h-0 relative overflow-hidden"
          onTouchStart={isMobile ? handleTouchStart : undefined}
          onTouchEnd={isMobile ? handleTouchEnd : undefined}
        >
          <div className="formation-pitch h-full w-full" style={{ minHeight: '300px', maxHeight: '100%' }}>
            <div className="goal-box-top"></div>
            <div className="goal-box-bottom"></div>
            
            {currentPeriod.positions.map((position, index) => {
              const player = squadPlayers.find(p => p.id === position.playerId);
              return (
                <PositionSlot
                  key={`${currentPeriod.id}-position-${index}`}
                  id={`${currentPeriod.id}-position-${index}`}
                  position={position}
                  player={player}
                  isCaptain={player?.id === globalCaptainId}
                  nameDisplayOption={nameDisplayOption}
                />
              );
            })}
          </div>
        </div>

        {/* Period Tabs - Game Day Style */}
        <div className="shrink-0 border-t bg-muted/30 px-2 py-2">
          <div className="flex items-center gap-2">
            {/* Left Arrow */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 shrink-0"
              onClick={() => setActivePeriodIndex(Math.max(0, activePeriodIndex - 1))}
              disabled={activePeriodIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            {/* Period Buttons */}
            <div className="flex-1 flex gap-1 overflow-x-auto scrollbar-hide">
              {periods.map((period, index) => (
                <Popover 
                  key={period.id} 
                  open={editingPeriodId === period.id}
                  onOpenChange={(open) => setEditingPeriodId(open ? period.id : null)}
                >
                  <PopoverTrigger asChild>
                    <button
                      className={`period-time-button flex-1 min-w-[60px] ${index === activePeriodIndex ? 'active' : ''}`}
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
              className="h-8 w-8 p-0 shrink-0"
              onClick={() => setActivePeriodIndex(Math.min(periods.length - 1, activePeriodIndex + 1))}
              disabled={activePeriodIndex === periods.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* Add Period Button */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 shrink-0"
              onClick={addPeriod}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Substitutes Bench */}
        <div className="shrink-0 px-2 pb-2">
          <SubstituteBench
            id={`substitutes-${currentPeriod.id}`}
            substitutes={getSubstitutePlayers()}
            globalCaptainId={globalCaptainId}
            nameDisplayOption={nameDisplayOption}
          />
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
