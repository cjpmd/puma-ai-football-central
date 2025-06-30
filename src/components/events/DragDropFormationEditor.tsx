
import { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Crown } from 'lucide-react';
import { PlayerIcon } from './PlayerIcon';
import { PositionSlot } from './PositionSlot';
import { SubstituteBench } from './SubstituteBench';
import { usePositionAbbreviations } from '@/hooks/usePositionAbbreviations';
import { SquadPlayer, FormationPeriod, PositionSlot as PositionSlotType } from '@/types/teamSelection';
import { formations } from '@/utils/formationUtils';

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
  
  const gameFormatFormations = formations[gameFormat as keyof typeof formations] || [];

  const addPeriod = () => {
    const newPeriodNumber = periods.length + 1;
    const lastPeriod = periods[periods.length - 1];
    
    // Create new period, duplicating the last period's formation if it exists
    const newPeriod: FormationPeriod = {
      id: `period-${newPeriodNumber}`,
      periodNumber: newPeriodNumber,
      formation: lastPeriod?.formation || gameFormatFormations[0]?.name || '4-4-2',
      duration: 45, // Default period duration
      positions: lastPeriod ? [...lastPeriod.positions] : [],
      substitutes: lastPeriod ? [...lastPeriod.substitutes] : [],
      captainId: globalCaptainId
    };

    onPeriodsChange([...periods, newPeriod]);
  };

  const updatePeriodFormation = (periodId: string, formation: string) => {
    const updatedPeriods = periods.map(period => {
      if (period.id === periodId) {
        // Clear positions when formation changes and create new position slots
        const newPositions = createPositionSlots(formation);
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

  const createPositionSlots = (formation: string): PositionSlotType[] => {
    const formationConfig = gameFormatFormations.find(f => f.name === formation);
    if (!formationConfig) return [];

    return formationConfig.positions.map((pos, index) => ({
      id: `position-${index}`,
      positionName: pos.position,
      abbreviation: positions.find(p => p.positionName === pos.position)?.abbreviation || pos.position.slice(0, 2).toUpperCase(),
      positionGroup: positions.find(p => p.positionName === pos.position)?.positionGroup || 'midfielder',
      x: pos.x,
      y: pos.y,
      playerId: undefined
    }));
  };

  const handleDragStart = (event: DragStartEvent) => {
    const playerId = event.active.id as string;
    const player = squadPlayers.find(p => p.id === playerId);
    setDraggedPlayer(player || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedPlayer(null);
    
    if (!over) return;

    const playerId = active.id as string;
    const targetId = over.id as string;
    
    // Handle dropping on position slots
    if (targetId.startsWith('position-')) {
      const [periodId, positionIndex] = targetId.split('-position-');
      updatePlayerPosition(periodId, parseInt(positionIndex), playerId);
    }
    
    // Handle dropping on substitute bench
    if (targetId.startsWith('substitutes-')) {
      const periodId = targetId.replace('substitutes-', '');
      addToSubstitutes(periodId, playerId);
    }
  };

  const updatePlayerPosition = (periodId: string, positionIndex: number, playerId: string) => {
    const updatedPeriods = periods.map(period => {
      if (period.id === periodId) {
        const newPositions = [...period.positions];
        
        // Remove player from any existing position
        newPositions.forEach(pos => {
          if (pos.playerId === playerId) {
            pos.playerId = undefined;
          }
        });
        
        // Remove player from substitutes
        const newSubstitutes = period.substitutes.filter(id => id !== playerId);
        
        // Add player to new position
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
    const updatedPeriods = periods.map(period => {
      if (period.id === periodId) {
        // Remove player from any position
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
      addPeriod();
    }
  }, [gameFormatFormations]);

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
                <CardTitle>
                  Period {period.periodNumber}
                  <Badge variant="outline" className="ml-2">
                    {period.duration} min
                  </Badge>
                </CardTitle>
                
                <div className="flex items-center gap-2">
                  <Select
                    value={period.formation}
                    onValueChange={(formation) => updatePeriodFormation(period.id, formation)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {gameFormatFormations.map((formation) => (
                        <SelectItem key={formation.name} value={formation.name}>
                          {formation.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
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
                </div>
              </div>

              {/* Formation Pitch */}
              <div className="relative bg-green-100 rounded-lg p-4" style={{ height: '400px' }}>
                <div className="absolute inset-0 bg-gradient-to-b from-green-200 to-green-300 rounded-lg opacity-30" />
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
