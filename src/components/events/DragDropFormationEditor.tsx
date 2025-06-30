
import { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Crown, Clock } from 'lucide-react';
import { PlayerIcon } from './PlayerIcon';
import { PositionSlot } from './PositionSlot';
import { SubstituteBench } from './SubstituteBench';
import { FormationSelector } from './FormationSelector';
import { usePositionAbbreviations } from '@/hooks/usePositionAbbreviations';
import { SquadPlayer, FormationPeriod, PositionSlot as PositionSlotType } from '@/types/teamSelection';
import { getFormationsByFormat } from '@/utils/formationUtils';

interface DragDropFormationEditorProps {
  squadPlayers: SquadPlayer[];
  periods: FormationPeriod[];
  gameFormat: string;
  globalCaptainId?: string;
  nameDisplayOption?: 'surname' | 'first' | 'full' | 'initials';
  onPeriodsChange: (periods: FormationPeriod[]) => void;
  onCaptainChange: (captainId: string) => void;
}

export const DragDropFormationEditor: React.FC<DragDropFormationEditorProps> = ({
  squadPlayers,
  periods,
  gameFormat,
  globalCaptainId,
  nameDisplayOption = 'surname',
  onPeriodsChange,
  onCaptainChange
}) => {
  const [draggedPlayer, setDraggedPlayer] = useState<SquadPlayer | null>(null);
  const { positions } = usePositionAbbreviations(gameFormat);
  
  const gameFormatFormations = getFormationsByFormat(gameFormat as any);

  console.log('DragDropFormationEditor render:', {
    squadPlayers: squadPlayers.length,
    periods: periods.length,
    gameFormat,
    formations: gameFormatFormations.length
  });

  const addPeriod = () => {
    const newPeriodNumber = periods.length + 1;
    const lastPeriod = periods[periods.length - 1];
    
    const newPeriod: FormationPeriod = {
      id: `period-${newPeriodNumber}`,
      periodNumber: newPeriodNumber,
      formation: lastPeriod?.formation || gameFormatFormations[0]?.id || '1-2-3-1',
      duration: 45,
      positions: lastPeriod ? [...lastPeriod.positions] : [],
      substitutes: lastPeriod ? [...lastPeriod.substitutes] : [],
      captainId: globalCaptainId
    };

    console.log('Adding new period:', newPeriod);
    onPeriodsChange([...periods, newPeriod]);
  };

  const updatePeriodFormation = (periodId: string, formation: string) => {
    console.log('Updating formation for period:', periodId, 'to:', formation);
    
    const updatedPeriods = periods.map(period => {
      if (period.id === periodId) {
        const newPositions = createPositionSlots(formation);
        console.log('Created new positions for formation:', formation, newPositions);
        return {
          ...period,
          formation,
          positions: newPositions
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
        abbreviation: positionData?.abbreviation || pos.position.slice(0, 2).toUpperCase(),
        positionGroup: positionData?.positionGroup || getPositionGroup(pos.position),
        x: pos.x,
        y: pos.y,
        playerId: undefined
      };
    });
  };

  const getPositionGroup = (positionName: string): 'goalkeeper' | 'defender' | 'midfielder' | 'forward' => {
    if (positionName.toLowerCase().includes('goalkeeper')) return 'goalkeeper';
    if (positionName.toLowerCase().includes('defender')) return 'defender';
    if (positionName.toLowerCase().includes('midfielder')) return 'midfielder';
    if (positionName.toLowerCase().includes('striker') || positionName.toLowerCase().includes('attacking')) return 'forward';
    return 'midfielder';
  };

  const handleDragStart = (event: DragStartEvent) => {
    const playerId = event.active.id as string;
    const player = squadPlayers.find(p => p.id === playerId);
    console.log('Drag started for player:', player?.name);
    setDraggedPlayer(player || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedPlayer(null);
    
    if (!over) {
      console.log('Drag ended with no target');
      return;
    }

    const playerId = active.id as string;
    const targetId = over.id as string;
    
    console.log('Drag ended:', { playerId, targetId });
    
    if (targetId.includes('-position-')) {
      const [periodId, positionIndex] = targetId.split('-position-');
      updatePlayerPosition(periodId, parseInt(positionIndex), playerId);
    } else if (targetId.startsWith('substitutes-')) {
      const periodId = targetId.replace('substitutes-', '');
      addToSubstitutes(periodId, playerId);
    }
  };

  const updatePlayerPosition = (periodId: string, positionIndex: number, playerId: string) => {
    console.log('Updating player position:', { periodId, positionIndex, playerId });
    
    const updatedPeriods = periods.map(period => {
      if (period.id === periodId) {
        const newPositions = [...period.positions];
        
        newPositions.forEach(pos => {
          if (pos.playerId === playerId) {
            pos.playerId = undefined;
          }
        });
        
        const newSubstitutes = period.substitutes.filter(id => id !== playerId);
        
        if (newPositions[positionIndex]) {
          newPositions[positionIndex].playerId = playerId;
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

  const addToSubstitutes = (periodId: string, playerId: string) => {
    console.log('Adding to substitutes:', { periodId, playerId });
    
    const updatedPeriods = periods.map(period => {
      if (period.id === periodId) {
        const newPositions = period.positions.map(pos => ({
          ...pos,
          playerId: pos.playerId === playerId ? undefined : pos.playerId
        }));
        
        const newSubstitutes = period.substitutes.includes(playerId) 
          ? period.substitutes 
          : [...period.substitutes, playerId];
        
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

  const getUnusedPlayers = (periodId: string) => {
    const period = periods.find(p => p.id === periodId);
    if (!period) return squadPlayers;
    
    const usedPlayerIds = [
      ...period.positions.map(pos => pos.playerId).filter(Boolean),
      ...period.substitutes
    ] as string[];
    
    return squadPlayers.filter(player => 
      !usedPlayerIds.includes(player.id) && 
      player.availabilityStatus === 'available'
    );
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

  return (
    <div className="space-y-6">
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* Captain Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Team Captain
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={globalCaptainId || ''} onValueChange={onCaptainChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select team captain..." />
              </SelectTrigger>
              <SelectContent>
                {squadPlayers
                  .filter(p => p.availabilityStatus === 'available')
                  .map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      #{player.squadNumber} {player.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Formation Periods */}
        {periods.map((period) => (
          <Card key={period.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Period {period.periodNumber}
                  <Badge variant="outline">
                    {period.duration} min
                  </Badge>
                </CardTitle>
                
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <Input
                      type="number"
                      value={period.duration}
                      onChange={(e) => updatePeriodDuration(period.id, parseInt(e.target.value) || 45)}
                      className="w-20"
                      min="1"
                      max="120"
                    />
                    <span className="text-sm text-muted-foreground">min</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Formation Selection */}
              <FormationSelector
                gameFormat={gameFormat as any}
                selectedFormation={period.formation}
                onFormationChange={(formation) => updatePeriodFormation(period.id, formation)}
              />

              {/* Available Players Pool */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Available Players</h4>
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg min-h-[100px]">
                  <SortableContext 
                    items={getUnusedPlayers(period.id).map(p => p.id)} 
                    strategy={verticalListSortingStrategy}
                  >
                    {getUnusedPlayers(period.id).map((player) => (
                      <div key={player.id} id={player.id}>
                        <PlayerIcon 
                          player={player} 
                          isCaptain={player.id === globalCaptainId}
                          nameDisplayOption={nameDisplayOption}
                        />
                      </div>
                    ))}
                  </SortableContext>
                  {getUnusedPlayers(period.id).length === 0 && (
                    <div className="text-sm text-muted-foreground">All available players are assigned</div>
                  )}
                </div>
              </div>

              {/* Formation Pitch */}
              <div className="relative bg-green-100 rounded-lg p-4" style={{ height: '400px' }}>
                <div className="absolute inset-0 bg-gradient-to-b from-green-200 to-green-300 rounded-lg opacity-30" />
                
                {/* Pitch markings */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 border-2 border-white rounded-full opacity-50" />
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white opacity-50" />
                <div className="absolute top-2 left-1/3 right-1/3 h-12 border-l-2 border-r-2 border-white opacity-50" />
                <div className="absolute bottom-2 left-1/3 right-1/3 h-12 border-l-2 border-r-2 border-white opacity-50" />
                
                <div className="relative h-full">
                  {period.positions.map((position, index) => (
                    <PositionSlot
                      key={`${period.id}-position-${index}`}
                      id={`${period.id}-position-${index}`}
                      position={position}
                      player={position.playerId ? squadPlayers.find(p => p.id === position.playerId) : undefined}
                      isCaptain={position.playerId === globalCaptainId}
                      nameDisplayOption={nameDisplayOption}
                    />
                  ))}
                </div>
              </div>

              {/* Substitute Bench */}
              <SubstituteBench
                id={`substitutes-${period.id}`}
                substitutes={period.substitutes.map(id => squadPlayers.find(p => p.id === id)!).filter(Boolean)}
                globalCaptainId={globalCaptainId}
                nameDisplayOption={nameDisplayOption}
              />
            </CardContent>
          </Card>
        ))}

        {/* Add Period Button */}
        <div className="flex justify-center">
          <Button onClick={addPeriod} variant="outline">
            <Plus className="h-4 w-4 mr-1" />
            Add Period
          </Button>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {draggedPlayer && (
            <PlayerIcon 
              player={draggedPlayer} 
              isDragging 
              isCaptain={draggedPlayer.id === globalCaptainId}
              nameDisplayOption={nameDisplayOption}
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
