import { useState, useEffect } from 'react';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter
} from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Clock, X, ChevronDown, ChevronUp, Users, AlertTriangle } from 'lucide-react';
import { PlayerIcon } from './PlayerIcon';
import { PositionSlot } from './PositionSlot';
import { SubstituteBench } from './SubstituteBench';
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
  const [draggedPlayer, setDraggedPlayer] = useState<SquadPlayer | null>(null);
  const [availablePlayersOpen, setAvailablePlayersOpen] = useState(true);
  const { positions } = usePositionAbbreviations(gameFormat);

  // Simplified sensors with very low activation constraints
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 1,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 50,
        tolerance: 2,
      },
    })
  );
  
  const gameFormatFormations = getFormationsByFormat(gameFormat as any);
  const mappedNameDisplayOption = mapNameDisplayOption(nameDisplayOption);

  console.log('DragDropFormationEditor render:', {
    squadPlayers: squadPlayers.length,
    periods: periods.length,
    gameFormat,
    formations: gameFormatFormations.length
  });

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

    console.log('Adding new period:', newPeriod);
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
    console.log('Updating formation for period:', periodId, 'to:', formation);
    
    const updatedPeriods = periods.map(period => {
      if (period.id === periodId) {
        const newPositions = createPositionSlots(formation);
        const preservedPositions = preservePlayerAssignments(period.positions, newPositions);
        
        console.log('Created new positions for formation:', formation, preservedPositions);
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
    console.log('Updating duration for period:', periodId, 'to:', duration);
    
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
      console.warn('No formation config found for:', formationId);
      return [];
    }

    console.log('Creating position slots for formation:', formationId, formationConfig);

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
    const dragId = event.active.id as string;
    console.log('Drag started with ID:', dragId);
    
    // Extract player ID from drag ID
    let playerId: string;
    
    if (dragId.includes('|')) {
      // Format: "period-1|position-0|player123" or "period-1|substitutes|player123"
      const parts = dragId.split('|');
      playerId = parts[parts.length - 1]; // Always the last part
    } else {
      // Direct player ID from available players pool
      playerId = dragId;
    }
    
    const player = squadPlayers.find(p => p.id === playerId);
    console.log('Drag started for player:', player?.name, 'with playerId:', playerId);
    setDraggedPlayer(player || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    console.log('Drag ended:', { 
      activeId: active.id, 
      overId: over?.id,
      draggedPlayer: draggedPlayer?.name
    });
    
    setDraggedPlayer(null);
    
    if (!over || !draggedPlayer) {
      console.log('No drop target or dragged player - cancelling drag');
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;
    const playerId = draggedPlayer.id;

    console.log('Processing drop for player:', playerId, 'to target:', overId);

    // Extract period ID from both source and target
    const getSourcePeriodId = (id: string): string | null => {
      if (id.includes('|')) {
        return id.split('|')[0];
      }
      return null; // From available players
    };

    const getTargetPeriodId = (id: string): string | null => {
      if (id.includes('-position-')) {
        return id.split('-position-')[0];
      } else if (id.startsWith('substitutes-')) {
        return id.replace('substitutes-', '');
      }
      return null;
    };

    const sourcePeriodId = getSourcePeriodId(activeId);
    const targetPeriodId = getTargetPeriodId(overId);

    console.log('Period IDs:', { sourcePeriodId, targetPeriodId });

    // Handle different drop targets
    if (overId.includes('-position-')) {
      // Dropping on a position slot: "period-1-position-0"
      const parts = overId.split('-position-');
      const periodId = parts[0];
      const positionIndex = parseInt(parts[1]);
      console.log('Dropping on position:', { periodId, positionIndex });
      movePlayerToPosition(playerId, periodId, positionIndex, sourcePeriodId);
    } else if (overId.startsWith('substitutes-')) {
      // Dropping on substitutes bench: "substitutes-period-1"
      const periodId = overId.replace('substitutes-', '');
      console.log('Dropping on substitutes for period:', periodId);
      movePlayerToSubstitutes(playerId, periodId, sourcePeriodId);
    } else {
      console.log('Unknown drop target:', overId);
    }
  };

  const movePlayerToPosition = (playerId: string, targetPeriodId: string, positionIndex: number, sourcePeriodId: string | null) => {
    console.log('Moving player to position:', { playerId, targetPeriodId, positionIndex, sourcePeriodId });
    
    const updatedPeriods = periods.map(period => {
      if (period.id === targetPeriodId) {
        const newPositions = [...period.positions];
        const newSubstitutes = [...period.substitutes];
        
        // Handle displaced player at target position
        const displacedPlayerId = newPositions[positionIndex]?.playerId;
        if (displacedPlayerId && displacedPlayerId !== playerId) {
          console.log('Displacing player:', displacedPlayerId);
          // Add displaced player to substitutes if not already there
          if (!newSubstitutes.includes(displacedPlayerId)) {
            newSubstitutes.push(displacedPlayerId);
          }
        }
        
        // Remove player from source location within the same period
        if (sourcePeriodId === targetPeriodId) {
          // Remove from substitutes if coming from substitutes
          const subIndex = newSubstitutes.indexOf(playerId);
          if (subIndex > -1) {
            newSubstitutes.splice(subIndex, 1);
            console.log('Removed from substitutes');
          }
          
          // Remove from other positions
          newPositions.forEach(pos => {
            if (pos.playerId === playerId) {
              pos.playerId = undefined;
              console.log('Removed from previous position');
            }
          });
        }
        
        // Assign player to new position
        if (newPositions[positionIndex]) {
          newPositions[positionIndex].playerId = playerId;
          console.log('Assigned to new position');
        }
        
        return {
          ...period,
          positions: newPositions,
          substitutes: newSubstitutes
        };
      } else if (period.id === sourcePeriodId) {
        // Only remove from source period if it's different from target
        const newPositions = [...period.positions];
        const newSubstitutes = [...period.substitutes];
        
        // Remove from positions
        newPositions.forEach(pos => {
          if (pos.playerId === playerId) {
            pos.playerId = undefined;
          }
        });
        
        // Remove from substitutes
        const subIndex = newSubstitutes.indexOf(playerId);
        if (subIndex > -1) {
          newSubstitutes.splice(subIndex, 1);
        }
        
        return {
          ...period,
          positions: newPositions,
          substitutes: newSubstitutes
        };
      }
      
      // Return unchanged for other periods
      return period;
    });
    
    onPeriodsChange(updatedPeriods);
  };

  const movePlayerToSubstitutes = (playerId: string, targetPeriodId: string, sourcePeriodId: string | null) => {
    console.log('Moving player to substitutes:', { playerId, targetPeriodId, sourcePeriodId });
    
    const updatedPeriods = periods.map(period => {
      if (period.id === targetPeriodId) {
        const newPositions = [...period.positions];
        const newSubstitutes = [...period.substitutes];
        
        // CRITICAL FIX: Always remove from positions when moving to substitutes
        // Check if player is currently in a position in this period
        let wasInPosition = false;
        newPositions.forEach(pos => {
          if (pos.playerId === playerId) {
            pos.playerId = undefined;
            wasInPosition = true;
            console.log('Removed player from position slot when moving to substitutes');
          }
        });
        
        // Remove from substitutes first to avoid duplicates
        const existingSubIndex = newSubstitutes.indexOf(playerId);
        if (existingSubIndex > -1) {
          newSubstitutes.splice(existingSubIndex, 1);
        }
        
        // Add to substitutes
        newSubstitutes.push(playerId);
        console.log('Added to substitutes:', playerId);
        
        return {
          ...period,
          positions: newPositions,
          substitutes: newSubstitutes
        };
      } else if (period.id === sourcePeriodId && sourcePeriodId !== targetPeriodId) {
        // Only remove from source period if it's different from target
        const newPositions = [...period.positions];
        const newSubstitutes = [...period.substitutes];
        
        // Remove from positions
        newPositions.forEach(pos => {
          if (pos.playerId === playerId) {
            pos.playerId = undefined;
          }
        });
        
        // Remove from substitutes
        const subIndex = newSubstitutes.indexOf(playerId);
        if (subIndex > -1) {
          newSubstitutes.splice(subIndex, 1);
        }
        
        return {
          ...period,
          positions: newPositions,
          substitutes: newSubstitutes
        };
      }
      
      // Return unchanged for other periods
      return period;
    });
    
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

  useEffect(() => {
    if (periods.length === 0 && gameFormatFormations.length > 0) {
      console.log('Auto-creating first period');
      addPeriod();
    }
  }, [gameFormatFormations]);

  useEffect(() => {
    periods.forEach(period => {
      if (period.positions.length === 0 && period.formation) {
        console.log('Auto-creating positions for period:', period.id, 'formation:', period.formation);
        updatePeriodFormation(period.id, period.formation);
      }
    });
  }, [periods]);

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
        <div className="relative bg-green-100 rounded-lg p-4 h-[350px] print:h-[300px]">
          <div className="absolute inset-0 bg-gradient-to-b from-green-200 to-green-300 rounded-lg opacity-30" />
          
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 border-2 border-white rounded-full opacity-50" />
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white opacity-50" />
          <div className="absolute top-2 left-1/4 right-1/4 h-10 border-l-2 border-r-2 border-white opacity-50" />
          <div className="absolute bottom-2 left-1/4 right-1/4 h-10 border-l-2 border-r-2 border-white opacity-50" />
          
          <div className="relative h-full">
            {period.positions.map((position, posIndex) => (
              <PositionSlot
                key={`${period.id}-position-${posIndex}`}
                id={`${period.id}-position-${posIndex}`}
                position={position}
                player={position.playerId ? squadPlayers.find(p => p.id === position.playerId) : undefined}
                isCaptain={position.playerId === globalCaptainId}
                nameDisplayOption={mappedNameDisplayOption}
                isLarger={true}
              />
            ))}
          </div>
        </div>

        <SubstituteBench
          id={`substitutes-${period.id}`}
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

        <Collapsible open={availablePlayersOpen} onOpenChange={setAvailablePlayersOpen}>
          <Card className="print:shadow-none print:border">
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-2 cursor-pointer hover:bg-gray-50 print:hover:bg-white">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    Available Players ({unusedPlayers.length})
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {unusedPlayers.length === 0 && (
                      <Badge variant="secondary" className="text-xs">All assigned</Badge>
                    )}
                    {availablePlayersOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg min-h-[60px] print:bg-gray-100">
                  {unusedPlayers.map((player) => (
                    <PlayerIcon
                      key={player.id}
                      player={player}
                      isCaptain={player.id === globalCaptainId}
                      nameDisplayOption={mappedNameDisplayOption}
                      isCircular={true}
                      dragId={player.id}
                    />
                  ))}
                  {unusedPlayers.length === 0 && (
                    <div className="text-sm text-muted-foreground">All available players are assigned</div>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <div className="space-y-6">
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
              
              <div className="flex justify-center mt-4 print:hidden">
                <Button onClick={addPeriod} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Period
                </Button>
              </div>
            </div>
          )}

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
              
              <div className="flex justify-center mt-4 print:hidden">
                <Button onClick={addPeriod} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Period
                </Button>
              </div>
            </div>
          )}
        </div>

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

        <DragOverlay>
          {draggedPlayer && (
            <div className="opacity-80">
              <PlayerIcon 
                player={draggedPlayer} 
                isCaptain={draggedPlayer.id === globalCaptainId}
                nameDisplayOption={mappedNameDisplayOption}
                isCircular={true}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
