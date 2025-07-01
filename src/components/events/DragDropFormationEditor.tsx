import { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
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
  const [draggedFromPeriod, setDraggedFromPeriod] = useState<string | null>(null);
  const [availablePlayersOpen, setAvailablePlayersOpen] = useState(true);
  const { positions } = usePositionAbbreviations(gameFormat);
  
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
    
    // Extract player ID and period ID from the drag ID
    let playerId: string;
    let periodId: string | null = null;
    
    if (dragId.includes('-position-')) {
      // Format: periodId-position-index-playerId
      const parts = dragId.split('-');
      periodId = parts[0];
      playerId = parts[parts.length - 1];
      setDraggedFromPeriod(periodId);
    } else {
      // Direct player ID from available players
      playerId = dragId;
      setDraggedFromPeriod(null);
    }
    
    const player = squadPlayers.find(p => p.id === playerId);
    console.log('Drag started for player:', player?.name, 'ID:', playerId, 'from period:', periodId);
    setDraggedPlayer(player || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    // Reset drag state
    setDraggedPlayer(null);
    setDraggedFromPeriod(null);
    
    if (!over) {
      console.log('Drag ended with no target');
      return;
    }

    const dragId = active.id as string;
    const targetId = over.id as string;
    
    console.log('Drag ended:', { dragId, targetId });
    
    // Extract player ID from drag ID
    let playerId: string;
    if (dragId.includes('-position-')) {
      const parts = dragId.split('-');
      playerId = parts[parts.length - 1];
    } else {
      playerId = dragId;
    }
    
    if (targetId.includes('-position-')) {
      const [periodId, positionIndex] = targetId.split('-position-');
      updatePlayerPosition(periodId, parseInt(positionIndex), playerId);
    } else if (targetId.startsWith('substitutes-')) {
      const periodId = targetId.replace('substitutes-', '');
      addToSubstitutes(periodId, playerId);
    }
  };

  const updatePlayerPosition = (targetPeriodId: string, positionIndex: number, playerId: string) => {
    console.log('Updating player position:', { targetPeriodId, positionIndex, playerId, draggedFromPeriod });
    
    const updatedPeriods = periods.map(period => {
      // Only modify the target period and the source period (if different)
      if (period.id === targetPeriodId) {
        const newPositions = [...period.positions];
        
        // Remove player from any existing position in THIS period only
        newPositions.forEach(pos => {
          if (pos.playerId === playerId) {
            pos.playerId = undefined;
          }
        });
        
        // Remove from substitutes in THIS period only
        const newSubstitutes = period.substitutes.filter(id => id !== playerId);
        
        // Add to new position
        if (newPositions[positionIndex]) {
          newPositions[positionIndex].playerId = playerId;
          console.log('Assigned player to position:', newPositions[positionIndex]);
        }
        
        return {
          ...period,
          positions: newPositions,
          substitutes: newSubstitutes
        };
      } else if (draggedFromPeriod && period.id === draggedFromPeriod && period.id !== targetPeriodId) {
        // Remove player from source period only if dragging between different periods
        const newPositions = period.positions.map(pos => ({
          ...pos,
          playerId: pos.playerId === playerId ? undefined : pos.playerId
        }));
        
        const newSubstitutes = period.substitutes.filter(id => id !== playerId);
        
        return {
          ...period,
          positions: newPositions,
          substitutes: newSubstitutes
        };
      }
      
      return period; // Don't modify other periods
    });
    
    console.log('Updated periods after position change:', updatedPeriods);
    onPeriodsChange(updatedPeriods);
  };

  const addToSubstitutes = (targetPeriodId: string, playerId: string) => {
    console.log('Adding to substitutes:', { targetPeriodId, playerId, draggedFromPeriod });
    
    const updatedPeriods = periods.map(period => {
      if (period.id === targetPeriodId) {
        // Remove from positions in THIS period only
        const newPositions = period.positions.map(pos => ({
          ...pos,
          playerId: pos.playerId === playerId ? undefined : pos.playerId
        }));
        
        // Add to substitutes if not already there
        const newSubstitutes = period.substitutes.includes(playerId) 
          ? period.substitutes 
          : [...period.substitutes, playerId];
        
        return {
          ...period,
          positions: newPositions,
          substitutes: newSubstitutes
        };
      } else if (draggedFromPeriod && period.id === draggedFromPeriod && period.id !== targetPeriodId) {
        // Remove player from source period only if dragging between different periods
        const newPositions = period.positions.map(pos => ({
          ...pos,
          playerId: pos.playerId === playerId ? undefined : pos.playerId
        }));
        
        const newSubstitutes = period.substitutes.filter(id => id !== playerId);
        
        return {
          ...period,
          positions: newPositions,
          substitutes: newSubstitutes
        };
      }
      
      return period; // Don't modify other periods
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

  // Initialize first period if none exist
  useEffect(() => {
    if (periods.length === 0 && gameFormatFormations.length > 0) {
      console.log('Auto-creating first period');
      addPeriod();
    }
  }, [gameFormatFormations]);

  // Auto-create position slots when formation changes
  useEffect(() => {
    periods.forEach(period => {
      if (period.positions.length === 0 && period.formation) {
        console.log('Auto-creating positions for period:', period.id, 'formation:', period.formation);
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

        {/* Collapsible Available Players Pool */}
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
                    <div 
                      key={player.id} 
                      id={player.id}
                      className="cursor-grab active:cursor-grabbing touch-none select-none print:cursor-default"
                      draggable
                    >
                      <PlayerIcon 
                        player={player} 
                        isCaptain={player.id === globalCaptainId}
                        nameDisplayOption={mappedNameDisplayOption}
                        isCircular={true}
                      />
                    </div>
                  ))}
                  {unusedPlayers.length === 0 && (
                    <div className="text-sm text-muted-foreground">All available players are assigned</div>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

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

        {/* Drag Overlay with improved visual feedback */}
        <DragOverlay>
          {draggedPlayer && (
            <div className="transform scale-110 shadow-2xl">
              <PlayerIcon 
                player={draggedPlayer} 
                isDragging 
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
