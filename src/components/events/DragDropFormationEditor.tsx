import { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Clock, X, ChevronDown, ChevronUp, Users, AlertTriangle } from 'lucide-react';
import { PositionSlot } from './PositionSlot';
import { SubstituteBench } from './SubstituteBench';
import { AvailablePlayersPool } from './AvailablePlayersPool';
import { PlayerIcon } from './PlayerIcon';
import { usePositionAbbreviations } from '@/hooks/usePositionAbbreviations';
import { SquadPlayer, FormationPeriod, PositionSlot as PositionSlotType } from '@/types/teamSelection';
import { getFormationsByFormat } from '@/utils/formationUtils';

interface DragDropFormationEditorProps {
  squadPlayers: SquadPlayer[];
  periods: FormationPeriod[];
  gameFormat: string;
  globalCaptainId?: string;
  nameDisplayOption?: 'surname' | 'firstName' | 'fullName' | 'initials';
  onPeriodsChange: (periods: FormationPeriod[]) => void;
  onCaptainChange: (captainId: string) => void;
  gameDuration?: number;
}

// Map team setting values to PlayerIcon expected values
const mapNameDisplayOption = (option: 'surname' | 'firstName' | 'fullName' | 'initials'): 'surname' | 'initials' | 'first' | 'full' => {
  switch (option) {
    case 'firstName':
      return 'first';
    case 'fullName':
      return 'full';
    case 'surname':
      return 'surname';
    case 'initials':
      return 'initials';
    default:
      return 'surname';
  }
};

export const DragDropFormationEditor: React.FC<DragDropFormationEditorProps> = ({
  squadPlayers,
  periods,
  gameFormat,
  globalCaptainId,
  nameDisplayOption = 'surname',
  onPeriodsChange,
  onCaptainChange,
  gameDuration = 50
}) => {
  const [availablePlayersOpen, setAvailablePlayersOpen] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { positions } = usePositionAbbreviations(gameFormat);
  
  const gameFormatFormations = getFormationsByFormat(gameFormat as any);
  const mappedNameDisplayOption = mapNameDisplayOption(nameDisplayOption);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Calculate half duration
  const halfDuration = gameDuration / 2;

  // Calculate game time for a period based on previous periods
  const calculateGameTime = (periodIndex: number) => {
    let startTime = 0;
    for (let i = 0; i < periodIndex; i++) {
      startTime += periods[i]?.duration || 0;
    }
    const endTime = startTime + (periods[periodIndex]?.duration || 0);
    return `${startTime}-${endTime}m`;
  };

  // Organize periods by halves
  const organizeByHalves = () => {
    const firstHalf: FormationPeriod[] = [];
    const secondHalf: FormationPeriod[] = [];
    
    let currentTime = 0;
    
    for (const period of periods) {
      if (currentTime < halfDuration) {
        firstHalf.push(period);
      } else {
        secondHalf.push(period);
      }
      currentTime += period.duration;
    }
    
    return { firstHalf, secondHalf };
  };

  // Check if total time exceeds game duration
  const getTotalTime = () => {
    return periods.reduce((total, period) => total + period.duration, 0);
  };

  // Check if half time exceeds limit
  const checkHalfTimeExceeded = () => {
    const { firstHalf, secondHalf } = organizeByHalves();
    
    const firstHalfTime = firstHalf.reduce((total, period) => total + period.duration, 0);
    const secondHalfTime = secondHalf.reduce((total, period) => total + period.duration, 0);
    
    return {
      firstHalfExceeded: firstHalfTime > halfDuration,
      secondHalfExceeded: secondHalfTime > halfDuration,
      totalExceeded: getTotalTime() > gameDuration,
      firstHalfTime,
      secondHalfTime
    };
  };

  const timeCheck = checkHalfTimeExceeded();

  const addPeriod = () => {
    const newPeriodNumber = periods.length + 1;
    const lastPeriod = periods[periods.length - 1];
    
    const newPeriod: FormationPeriod = {
      id: `period-${newPeriodNumber}`,
      periodNumber: newPeriodNumber,
      formation: lastPeriod?.formation || gameFormatFormations[0]?.id || '1-2-3-1',
      duration: 8,
      positions: lastPeriod ? [...lastPeriod.positions] : [],
      substitutes: lastPeriod ? [...lastPeriod.substitutes] : [],
      captainId: globalCaptainId
    };

    onPeriodsChange([...periods, newPeriod]);
  };

  const deletePeriod = (periodId: string) => {
    const updatedPeriods = periods.filter(period => period.id !== periodId);
    onPeriodsChange(updatedPeriods);
  };

  const getPositionGroup = (positionName: string): 'goalkeeper' | 'defender' | 'midfielder' | 'forward' => {
    if (positionName.toLowerCase().includes('goalkeeper')) return 'goalkeeper';
    if (positionName.toLowerCase().includes('defender')) return 'defender';
    if (positionName.toLowerCase().includes('midfielder')) return 'midfielder';
    if (positionName.toLowerCase().includes('striker') || positionName.toLowerCase().includes('attacking')) return 'forward';
    return 'midfielder';
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
        updatedPositions[matchIndex] = {
          ...updatedPositions[matchIndex],
          playerId: oldPos.playerId
        };
      }
    });
    
    return updatedPositions;
  };

  const updatePeriodFormation = (periodId: string, formation: string) => {
    const updatedPeriods = periods.map(period => {
      if (period.id === periodId) {
        const newPositions = createPositionSlots(formation);
        const preservedPositions = preservePlayerAssignments(period.positions, newPositions);
        
        return {
          ...period,
          formation,
          positions: preservedPositions
        };
      }
      return period;
    });
    onPeriodsChange(updatedPeriods);
  };

  const updatePeriodDuration = (periodId: string, duration: number) => {
    const updatedPeriods = periods.map(period => {
      if (period.id === periodId) {
        return { ...period, duration };
      }
      return period;
    });
    onPeriodsChange(updatedPeriods);
  };

  const createPositionSlots = (formationId: string): PositionSlotType[] => {
    const formationConfig = gameFormatFormations.find(f => f.id === formationId);
    if (!formationConfig) {
      return [];
    }

    return formationConfig.positions.map((pos, index) => {
      const positionData = positions.find(p => p.positionName === pos.position);
      
      return {
        id: `position-${index}`,
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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (!over || active.id === over.id) {
      return;
    }

    const playerId = active.id as string;
    const overId = over.id as string;

    // Create a copy of periods to modify
    const updatedPeriods = [...periods];

    // Find current location of the player
    let sourceLocation: { type: 'available' | 'position' | 'substitutes'; periodId?: string; positionIndex?: number } = { type: 'available' };
    
    for (const period of updatedPeriods) {
      const positionIndex = period.positions.findIndex(pos => pos.playerId === playerId);
      if (positionIndex !== -1) {
        sourceLocation = { type: 'position', periodId: period.id, positionIndex };
        break;
      }
      
      if (period.substitutes.includes(playerId)) {
        sourceLocation = { type: 'substitutes', periodId: period.id };
        break;
      }
    }

    // Determine target location
    const targetPeriod = updatedPeriods.find(p => overId.startsWith(p.id));
    if (!targetPeriod) return;

    // Remove player from source location
    if (sourceLocation.type === 'position' && sourceLocation.periodId && sourceLocation.positionIndex !== undefined) {
      const sourcePeriod = updatedPeriods.find(p => p.id === sourceLocation.periodId);
      if (sourcePeriod) {
        sourcePeriod.positions[sourceLocation.positionIndex].playerId = undefined;
      }
    } else if (sourceLocation.type === 'substitutes' && sourceLocation.periodId) {
      const sourcePeriod = updatedPeriods.find(p => p.id === sourceLocation.periodId);
      if (sourcePeriod) {
        const index = sourcePeriod.substitutes.indexOf(playerId);
        if (index > -1) {
          sourcePeriod.substitutes.splice(index, 1);
        }
      }
    }

    // Handle different drop targets
    if (overId.endsWith('-substitutes')) {
      // Dropped on substitutes bench
      if (!targetPeriod.substitutes.includes(playerId)) {
        targetPeriod.substitutes.push(playerId);
      }
    } else {
      // Dropped on position slot
      const positionIndex = parseInt(overId.split('-position-')[1]);
      if (!isNaN(positionIndex) && targetPeriod.positions[positionIndex]) {
        const targetPosition = targetPeriod.positions[positionIndex];
        
        // If position is occupied, move that player to substitutes
        if (targetPosition.playerId && targetPosition.playerId !== playerId) {
          if (!targetPeriod.substitutes.includes(targetPosition.playerId)) {
            targetPeriod.substitutes.push(targetPosition.playerId);
          }
        }
        
        // Place the dragged player in the position
        targetPosition.playerId = playerId;
      }
    }

    onPeriodsChange(updatedPeriods);
  };

  const getUnusedPlayers = () => {
    const allUsedPlayerIds = new Set();
    
    periods.forEach(period => {
      period.positions.forEach(pos => {
        if (pos.playerId) allUsedPlayerIds.add(pos.playerId);
      });
      period.substitutes.forEach(id => allUsedPlayerIds.add(id));
    });
    
    return squadPlayers.filter(player => 
      !allUsedPlayerIds.has(player.id) && 
      player.availabilityStatus === 'available'
    );
  };

  const calculatePlayingTimeSummary = () => {
    const playerTimes: Record<string, number> = {};
    
    periods.forEach(period => {
      period.positions.forEach(pos => {
        if (pos.playerId) {
          playerTimes[pos.playerId] = (playerTimes[pos.playerId] || 0) + period.duration;
        }
      });
    });
    
    return playerTimes;
  };

  // Initialize first period if none exist
  useEffect(() => {
    if (periods.length === 0 && gameFormatFormations.length > 0) {
      addPeriod();
    }
  }, [gameFormatFormations]);

  // Auto-create position slots when formation changes
  useEffect(() => {
    periods.forEach(period => {
      if (period.positions.length === 0 && period.formation) {
        updatePeriodFormation(period.id, period.formation);
      }
    });
  }, [periods]);

  // Auto-collapse available players when all are assigned
  useEffect(() => {
    const unusedPlayers = getUnusedPlayers();
    if (unusedPlayers.length === 0 && availablePlayersOpen) {
      setAvailablePlayersOpen(false);
    } else if (unusedPlayers.length > 0 && !availablePlayersOpen) {
      setAvailablePlayersOpen(true);
    }
  }, [squadPlayers, periods]);

  const playingTimeSummary = calculatePlayingTimeSummary();
  const unusedPlayers = getUnusedPlayers();
  const { firstHalf, secondHalf } = organizeByHalves();
  const activePlayer = activeId ? squadPlayers.find(p => p.id === activeId) : null;

  const renderPeriodCard = (period: FormationPeriod) => (
    <Card key={period.id} className="min-h-[550px] print:shadow-none print:border print:break-inside-avoid">
      <CardHeader className="pb-3">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <CardTitle className="text-lg mb-2">Period {period.periodNumber}</CardTitle>
              <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                <span>{calculateGameTime(periods.findIndex(p => p.id === period.id))}</span>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <Input
                    type="number"
                    value={period.duration}
                    onChange={(e) => updatePeriodDuration(period.id, parseInt(e.target.value) || 8)}
                    className="w-20 h-7 text-xs text-center"
                    min="1"
                    max="90"
                  />
                  <span className="text-xs">min</span>
                </div>
              </div>
            </div>
            {periods.length > 1 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deletePeriod(period.id)}
                className="h-6 w-6 p-0 print:hidden"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          <Select value={period.formation} onValueChange={(formation) => updatePeriodFormation(period.id, formation)}>
            <SelectTrigger className="h-7 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {gameFormatFormations.map((formation) => (
                <SelectItem key={formation.id} value={formation.id}>
                  {formation.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <PositionSlot
          periodId={period.id}
          positions={period.positions}
          squadPlayers={squadPlayers}
          globalCaptainId={globalCaptainId}
          nameDisplayOption={mappedNameDisplayOption}
        />

        <SubstituteBench
          periodId={period.id}
          substitutes={period.substitutes.map(id => squadPlayers.find(p => p.id === id)!).filter(Boolean)}
          globalCaptainId={globalCaptainId}
          nameDisplayOption={mappedNameDisplayOption}
        />
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4 print:text-sm">
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Time Validation Alert */}
        {(timeCheck.totalExceeded || timeCheck.firstHalfExceeded || timeCheck.secondHalfExceeded) && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {timeCheck.totalExceeded && `Total time (${getTotalTime()}min) exceeds game duration (${gameDuration}min). `}
              {timeCheck.firstHalfExceeded && `First half (${timeCheck.firstHalfTime}min) exceeds half time (${halfDuration}min). `}
              {timeCheck.secondHalfExceeded && `Second half (${timeCheck.secondHalfTime}min) exceeds half time (${halfDuration}min). `}
            </AlertDescription>
          </Alert>
        )}

        {/* Available Players Pool */}
        <AvailablePlayersPool
          players={unusedPlayers}
          isOpen={availablePlayersOpen}
          onToggle={setAvailablePlayersOpen}
          globalCaptainId={globalCaptainId}
          nameDisplayOption={mappedNameDisplayOption}
        />

        {/* Formation Periods - Organized by Halves with Responsive Grid */}
        <div className="space-y-6">
          {/* First Half */}
          {firstHalf.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">First Half ({halfDuration} minutes)</h3>
                <div className="text-sm text-muted-foreground">
                  Total: {firstHalf.reduce((total, period) => total + period.duration, 0)} minutes
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                {firstHalf.map((period) => renderPeriodCard(period))}
              </div>
              
              {/* Add Period Button for First Half */}
              <div className="flex justify-center mt-4 print:hidden">
                <Button onClick={addPeriod} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Period
                </Button>
              </div>
            </div>
          )}

          {/* Second Half */}
          {secondHalf.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Second Half ({halfDuration} minutes)</h3>
                <div className="text-sm text-muted-foreground">
                  Total: {secondHalf.reduce((total, period) => total + period.duration, 0)} minutes
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                {secondHalf.map((period) => renderPeriodCard(period))}
              </div>
              
              {/* Add Period Button for Second Half */}
              <div className="flex justify-center mt-4 print:hidden">
                <Button onClick={addPeriod} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Period
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Playing Time Summary - 3 Column Layout */}
        {Object.keys(playingTimeSummary).length > 0 && (
          <Card className="print:shadow-none print:border print:break-inside-avoid">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Playing Time Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm">
                {Object.entries(playingTimeSummary)
                  .sort(([, a], [, b]) => b - a)
                  .map(([playerId, minutes]) => {
                    const player = squadPlayers.find(p => p.id === playerId);
                    if (!player) return null;
                    
                    return (
                      <div key={playerId} className="flex items-center justify-between py-1 border-b border-gray-100 last:border-b-0">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Badge variant="outline" className="text-xs px-1 py-0">#{player.squadNumber}</Badge>
                          <span className="font-medium text-xs truncate">{player.name}</span>
                          {player.id === globalCaptainId && (
                            <Badge variant="secondary" className="text-xs px-1 py-0">C</Badge>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs ml-2">{minutes}m</Badge>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Drag Overlay */}
        <DragOverlay>
          {activePlayer ? (
            <PlayerIcon
              player={activePlayer}
              isCaptain={activePlayer.id === globalCaptainId}
              nameDisplayOption={mappedNameDisplayOption}
              isCircular={true}
              isDragging={true}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};