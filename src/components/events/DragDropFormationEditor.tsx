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
const mapNameDisplayOption = (option: 'surname' | 'firstName' | 'fullName' | 'initials'): 'surname' | 'firstName' | 'fullName' | 'initials' => {
  // Direct mapping since the types now match
  return option;
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

  // Improved sensors with better activation constraints and proper coordinate handling
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 5,
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

  const halfDuration = gameDuration / 2;

  const calculateGameTime = (periodIndex: number) => {
    let startTime = 0;
    for (let i = 0; i < periodIndex; i++) {
      startTime += periods[i]?.duration || 0;
    }
    const endTime = startTime + (periods[periodIndex]?.duration || 0);
    return `${startTime}-${endTime}m`;
  };

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

  const getTotalTime = () => {
    return periods.reduce((total, period) => total + period.duration, 0);
  };

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
      positions: lastPeriod ? [...lastPeriod.positions] : createPositionSlots(lastPeriod?.formation || gameFormatFormations[0]?.id || '1-2-3-1'),
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
    
    // Force a re-render to ensure positions appear immediately
    setTimeout(() => {
      onPeriodsChange(updatedPeriods);
    }, 0);
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
      // Format: "period-1|position|player123" or "period-1|substitutes|player123"
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

    // Extract source period from drag ID
    const getSourcePeriodId = (id: string): string | null => {
      if (id.includes('|')) {
        return id.split('|')[0];
      }
      return null;
    };

    // Extract target period and type from drop target ID
    const getTargetInfo = (id: string): { periodId: string | null, type: 'position' | 'substitutes', positionIndex?: number } => {
      if (id.includes('-position-')) {
        const parts = id.split('-position-');
        return {
          periodId: parts[0],
          type: 'position',
          positionIndex: parseInt(parts[1])
        };
      } else if (id.startsWith('substitutes-')) {
        return {
          periodId: id.replace('substitutes-', ''),
          type: 'substitutes'
        };
      }
      return { periodId: null, type: 'position' };
    };

    const sourcePeriodId = getSourcePeriodId(activeId);
    const targetInfo = getTargetInfo(overId);

    console.log('Drag info:', { sourcePeriodId, targetInfo });

    if (targetInfo.type === 'position' && targetInfo.positionIndex !== undefined) {
      movePlayerToPosition(playerId, targetInfo.periodId!, targetInfo.positionIndex, sourcePeriodId);
    } else if (targetInfo.type === 'substitutes') {
      movePlayerToSubstitutes(playerId, targetInfo.periodId!, sourcePeriodId);
    }
  };

  const movePlayerToPosition = (playerId: string, targetPeriodId: string, positionIndex: number, sourcePeriodId: string | null) => {
    console.log('Moving player to position:', { playerId, targetPeriodId, positionIndex, sourcePeriodId });
    
    const updatedPeriods = periods.map(period => {
      if (period.id === targetPeriodId) {
        const newPositions = [...period.positions];
        const newSubstitutes = [...period.substitutes];
        
        // Handle displaced player (if any)
        const displacedPlayerId = newPositions[positionIndex]?.playerId;
        if (displacedPlayerId && displacedPlayerId !== playerId) {
          console.log('Displacing player:', displacedPlayerId);
          if (!newSubstitutes.includes(displacedPlayerId)) {
            newSubstitutes.push(displacedPlayerId);
          }
        }
        
        // Remove player from current position/substitutes in same period
        if (sourcePeriodId === targetPeriodId) {
          // Remove from substitutes
          const subIndex = newSubstitutes.indexOf(playerId);
          if (subIndex > -1) {
            newSubstitutes.splice(subIndex, 1);
            console.log('Removed from substitutes in same period');
          }
          
          // Remove from any other position
          newPositions.forEach(pos => {
            if (pos.playerId === playerId) {
              pos.playerId = undefined;
              console.log('Removed from previous position in same period');
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
        // Remove player from source period (different period)
        const newPositions = [...period.positions];
        const newSubstitutes = [...period.substitutes];
        
        // Remove from positions
        newPositions.forEach(pos => {
          if (pos.playerId === playerId) {
            pos.playerId = undefined;
            console.log('Removed from source period position');
          }
        });
        
        // Remove from substitutes
        const subIndex = newSubstitutes.indexOf(playerId);
        if (subIndex > -1) {
          newSubstitutes.splice(subIndex, 1);
          console.log('Removed from source period substitutes');
        }
        
        return {
          ...period,
          positions: newPositions,
          substitutes: newSubstitutes
        };
      }
      
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
        
        // Remove from positions in target period
        newPositions.forEach(pos => {
          if (pos.playerId === playerId) {
            pos.playerId = undefined;
            console.log('Removed player from position when moving to substitutes');
          }
        });
        
        // Remove from existing substitutes and add back (to avoid duplicates)
        const existingSubIndex = newSubstitutes.indexOf(playerId);
        if (existingSubIndex > -1) {
          newSubstitutes.splice(existingSubIndex, 1);
        }
        
        newSubstitutes.push(playerId);
        console.log('Added to substitutes:', playerId);
        
        return {
          ...period,
          positions: newPositions,
          substitutes: newSubstitutes
        };
      } else if (period.id === sourcePeriodId && sourcePeriodId !== targetPeriodId) {
        // Remove from source period (different period)
        const newPositions = [...period.positions];
        const newSubstitutes = [...period.substitutes];
        
        newPositions.forEach(pos => {
          if (pos.playerId === playerId) {
            pos.playerId = undefined;
          }
        });
        
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
      
      return period;
    });
    
    onPeriodsChange(updatedPeriods);
  };

  const getUnusedPlayers = () => {
    const allUsedPlayerIds = new Set<string>();
    
    periods.forEach(period => {
      period.positions.forEach(pos => {
        if (pos.playerId) allUsedPlayerIds.add(pos.playerId);
      });
      period.substitutes.forEach(id => allUsedPlayerIds.add(id));
    });
    
    // Include both available and pending players
    return squadPlayers.filter(player => 
      !allUsedPlayerIds.has(player.id) && 
      (player.availabilityStatus === 'available' || player.availabilityStatus === 'pending')
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

  const getPositionGroupColor = (position: string) => {
    const pos = position?.toLowerCase() || '';
    
    if (pos.includes('goalkeeper') || pos === 'gk') {
      return 'border-yellow-400 bg-yellow-50';
    } else if (pos.includes('defender') || pos.startsWith('d')) {
      return 'border-blue-400 bg-blue-50';
    } else if (pos.includes('midfielder') || pos.startsWith('m') || pos.includes('mid')) {
      return 'border-green-400 bg-green-50';
    } else {
      // Forwards/Attackers/Strikers
      return 'border-red-400 bg-red-50';
    }
  };

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
            {period.positions.map((position, index) => {
              const player = position.playerId ? squadPlayers.find(p => p.id === position.playerId) : undefined;
              const isCaptain = position.playerId === globalCaptainId;
              const positionGroupColor = getPositionGroupColor(position.positionName);
              
              return (
                <div key={`${period.id}-position-${index}`}>
                  {/* Drop zone for position */}
                  <PositionSlot
                    id={`${period.id}-position-${index}`}
                    position={position}
                    player={player}
                    isCaptain={isCaptain}
                    nameDisplayOption={mappedNameDisplayOption}
                    isLarger={true}
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
                      <div className={`rounded-full border-2 ${positionGroupColor} p-1`}>
                        <PlayerIcon
                          player={player}
                          isCaptain={isCaptain}
                          nameDisplayOption={mappedNameDisplayOption}
                          isCircular={true}
                          dragId={`${period.id}|position|${player.id}`}
                          positionAbbreviation={position.abbreviation}
                          showPositionLabel={true}
                          isLarger={true}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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
    <DndContext 
      sensors={sensors} 
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6 print:space-y-4">
        {/* Time tracking alerts */}
        {(timeCheck.totalExceeded || timeCheck.firstHalfExceeded || timeCheck.secondHalfExceeded) && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {timeCheck.totalExceeded && `Total time (${getTotalTime()}min) exceeds game duration (${gameDuration}min). `}
              {timeCheck.firstHalfExceeded && `First half (${timeCheck.firstHalfTime}min) exceeds ${halfDuration}min. `}
              {timeCheck.secondHalfExceeded && `Second half (${timeCheck.secondHalfTime}min) exceeds ${halfDuration}min.`}
            </AlertDescription>
          </Alert>
        )}

        {/* Available Players */}
        <Collapsible open={availablePlayersOpen} onOpenChange={setAvailablePlayersOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Available Players ({unusedPlayers.length})</span>
              </div>
              {availablePlayersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="print:block">
            <Card>
              <CardContent className="pt-4">
                {unusedPlayers.length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">
                    All available players have been assigned
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {unusedPlayers.map((player) => (
                      <PlayerIcon
                        key={player.id}
                        player={player}
                        isCaptain={player.id === globalCaptainId}
                        nameDisplayOption={mappedNameDisplayOption}
                        isCircular={false}
                        dragId={player.id}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Periods organized by halves */}
        <div className="space-y-6">
          {firstHalf.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">First Half ({timeCheck.firstHalfTime}min)</h3>
                <Badge variant={timeCheck.firstHalfExceeded ? "destructive" : "secondary"}>
                  {timeCheck.firstHalfTime}/{halfDuration}min
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {firstHalf.map(renderPeriodCard)}
              </div>
            </div>
          )}

          {secondHalf.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Second Half ({timeCheck.secondHalfTime}min)</h3>
                <Badge variant={timeCheck.secondHalfExceeded ? "destructive" : "secondary"}>
                  {timeCheck.secondHalfTime}/{halfDuration}min
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {secondHalf.map(renderPeriodCard)}
              </div>
            </div>
          )}
        </div>

        {/* Add Period Button */}
        <div className="flex justify-center print:hidden">
          <Button onClick={addPeriod} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Period
          </Button>
        </div>

        {/* Playing Time Summary */}
        {Object.keys(playingTimeSummary).length > 0 && (
          <Card className="print:break-inside-avoid">
            <CardHeader>
              <CardTitle className="text-lg">Playing Time Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {Object.entries(playingTimeSummary).map(([playerId, minutes]) => {
                  const player = squadPlayers.find(p => p.id === playerId);
                  if (!player) return null;
                  
                  return (
                    <div key={playerId} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm font-medium">{player.name}</span>
                      <Badge variant="outline">{minutes}min</Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <DragOverlay>
        {draggedPlayer && (
          <PlayerIcon
            player={draggedPlayer}
            isCaptain={draggedPlayer.id === globalCaptainId}
            nameDisplayOption={mappedNameDisplayOption}
            isCircular={true}
            isDragging={true}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
};
