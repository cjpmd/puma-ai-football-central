import React, { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Users, Clock, Target } from 'lucide-react';
import { PlayerIcon } from './PlayerIcon';
import { PositionSlot } from './PositionSlot';
import { SubstituteBench } from './SubstituteBench';
import { PlayerSelectionPanel } from './PlayerSelectionPanel';
import { FormationSelector } from './FormationSelector';
import { SquadPlayer, FormationPeriod, Position } from '@/types/teamSelection';
import { GameFormat } from '@/types';

interface DragDropFormationEditorProps {
  squadPlayers: SquadPlayer[];
  periods: FormationPeriod[];
  gameFormat: GameFormat;
  globalCaptainId?: string;
  nameDisplayOption?: 'full_name' | 'surname' | 'first_name';
  onPeriodsChange: (periods: FormationPeriod[]) => void;
  onCaptainChange: (captainId: string) => void;
  gameDuration: number;
}

export const DragDropFormationEditor: React.FC<DragDropFormationEditorProps> = ({
  squadPlayers,
  periods,
  gameFormat,
  globalCaptainId,
  nameDisplayOption = 'surname',
  onPeriodsChange,
  onCaptainChange,
  gameDuration
}) => {
  const [currentPeriodIndex, setCurrentPeriodIndex] = useState(0);
  const [activePlayer, setActivePlayer] = useState<SquadPlayer | null>(null);
  const [showPlayerPanel, setShowPlayerPanel] = useState(false);

  useEffect(() => {
    if (periods.length === 0) {
      addPeriod();
    }
  }, [periods.length]);

  const updatePeriod = (index: number, updates: Partial<FormationPeriod>) => {
    const updatedPeriods = [...periods];
    updatedPeriods[index] = { ...updatedPeriods[index], ...updates };
    onPeriodsChange(updatedPeriods);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const playerId = event.active.id.toString();
    const player = squadPlayers.find((p) => p.id === playerId);
    setActivePlayer(player || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActivePlayer(null);

    if (event.over) {
      const positionId = event.over.id.toString();
      const playerId = event.active.id.toString();

      if (positionId.startsWith('position-')) {
        addPlayerToPosition(positionId, playerId);
      } else if (positionId.startsWith('substitute-')) {
        addPlayerToBench(playerId);
      }
    }
  };

  const addPlayerToPosition = (positionId: string, playerId: string) => {
    const updatedPositions = currentPeriod.positions.map((pos) => {
      if (pos.id === positionId) {
        return { ...pos, playerId: playerId };
      }
      return pos;
    });

    updatePeriod(currentPeriodIndex, { positions: updatedPositions });
  };

  const removePlayerFromPosition = (positionId: string) => {
    const updatedPositions = currentPeriod.positions.map((pos) => {
      if (pos.id === positionId) {
        return { ...pos, playerId: undefined };
      }
      return pos;
    });

    updatePeriod(currentPeriodIndex, { positions: updatedPositions });
  };

  const addPlayerToBench = (playerId: string) => {
    if (!currentPeriod.substitutes.includes(playerId)) {
      const updatedSubstitutes = [...currentPeriod.substitutes, playerId];
      updatePeriod(currentPeriodIndex, { substitutes: updatedSubstitutes });
    }
  };

  const removeFromBench = (playerId: string) => {
    const updatedSubstitutes = currentPeriod.substitutes.filter((id) => id !== playerId);
    updatePeriod(currentPeriodIndex, { substitutes: updatedSubstitutes });
  };

  const getAvailablePlayersForSelection = () => {
    // Show ALL squad players regardless of availability status
    // This includes available, pending, unavailable, and maybe players
    const currentPeriod = periods[currentPeriodIndex];
    if (!currentPeriod) return squadPlayers;

    const assignedPlayerIds = new Set([
      ...currentPeriod.positions.map(pos => pos.playerId).filter(Boolean),
      ...currentPeriod.substitutes
    ]);

    return squadPlayers.filter(player => !assignedPlayerIds.has(player.id));
  };

  const getPlayerAvailabilityBadge = (player: SquadPlayer) => {
    switch (player.availabilityStatus) {
      case 'available':
        return <Badge variant="outline" className="text-xs bg-green-100 text-green-800">Available</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'unavailable':
        return <Badge variant="outline" className="text-xs bg-red-100 text-red-800">Unavailable</Badge>;
      case 'maybe':
        return <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800">Maybe</Badge>;
      default:
        return null;
    }
  };

  const getPlayerBorderStyle = (player: SquadPlayer) => {
    switch (player.availabilityStatus) {
      case 'available':
        return 'border-green-200 bg-green-50';
      case 'pending':
        return 'border-yellow-200 bg-yellow-50';
      case 'unavailable':
        return 'border-red-200 bg-red-50 opacity-70';
      case 'maybe':
        return 'border-orange-200 bg-orange-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const addPeriod = () => {
    const newPeriodNumber = periods.length > 0 ? Math.max(...periods.map(p => p.periodNumber)) + 1 : 1;
    const newPeriod: FormationPeriod = {
      id: `period-${newPeriodNumber}`,
      periodNumber: newPeriodNumber,
      formation: '4-3-3',
      duration: gameDuration || 50,
      positions: getInitialPositionsForFormation('4-3-3', gameFormat),
      substitutes: [],
      captainId: globalCaptainId
    };

    onPeriodsChange([...periods, newPeriod]);
    setCurrentPeriodIndex(periods.length);
  };

  const deletePeriod = (index: number) => {
    const updatedPeriods = periods.filter((_, i) => i !== index);
    onPeriodsChange(updatedPeriods);
    setCurrentPeriodIndex(Math.max(0, index - 1));
  };

  const getInitialPositionsForFormation = (formation: string, gameFormat: GameFormat): Position[] => {
    const positions: Position[] = [];
    let positionNames: string[] = [];

    switch (formation) {
      case '4-3-3':
        positionNames = ['GK', 'RB', 'CB', 'CB', 'LB', 'CM', 'CM', 'CM', 'RW', 'ST', 'LW'];
        break;
      case '4-4-2':
        positionNames = ['GK', 'RB', 'CB', 'CB', 'LB', 'RM', 'CM', 'CM', 'LM', 'ST', 'ST'];
        break;
      case '3-5-2':
        positionNames = ['GK', 'CB', 'CB', 'CB', 'RWB', 'CM', 'CM', 'CM', 'LWB', 'ST', 'ST'];
        break;
      case '4-2-3-1':
        positionNames = ['GK', 'RB', 'CB', 'CB', 'LB', 'CDM', 'CDM', 'CAM', 'RW', 'LW', 'ST'];
        break;
      case '3-4-3':
        positionNames = ['GK', 'CB', 'CB', 'CB', 'RM', 'CM', 'CM', 'LM', 'RW', 'ST', 'LW'];
        break;
      default:
        positionNames = ['GK', 'RB', 'CB', 'CB', 'LB', 'CM', 'CM', 'CM', 'RW', 'ST', 'LW'];
    }

    positionNames.forEach((name, index) => {
      positions.push({
        id: `position-${index}`,
        positionName: name,
        abbreviation: name.substring(0, 2),
        positionGroup: 'midfielder',
        x: 50,
        y: 50,
        playerId: undefined
      });
    });

    return positions;
  };

  const currentPeriod = periods[currentPeriodIndex];
  const availablePlayersForSelection = getAvailablePlayersForSelection();

  return (
    <div className="space-y-6">
      {/* Period Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Formation Periods
            </CardTitle>
            <Button onClick={addPeriod} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Period
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {periods.map((period, index) => (
              <Button
                key={period.id}
                variant={index === currentPeriodIndex ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentPeriodIndex(index)}
                className="flex items-center gap-1"
              >
                Period {period.periodNumber}
                <Badge variant="secondary" className="text-xs">
                  {period.duration}min
                </Badge>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {currentPeriod && (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {/* Formation Display */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Period {currentPeriod.periodNumber} - {currentPeriod.formation}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <FormationSelector
                    value={currentPeriod.formation}
                    gameFormat={gameFormat}
                    onChange={(formation) => updatePeriod(currentPeriodIndex, { formation })}
                  />
                  <Select
                    value={currentPeriod.duration.toString()}
                    onValueChange={(value) => updatePeriod(currentPeriodIndex, { duration: parseInt(value) })}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 8, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90].map(duration => (
                        <SelectItem key={duration} value={duration.toString()}>
                          {duration}min
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Formation pitch display */}
              <div className="bg-green-100 rounded-lg p-6 min-h-[400px] relative">
                {currentPeriod.positions.map((position) => (
                  <PositionSlot
                    key={position.id}
                    position={position}
                    gameFormat={gameFormat}
                    onRemovePlayer={removePlayerFromPosition}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Substitutes Bench */}
          <SubstituteBench
            substitutes={currentPeriod.substitutes}
            squadPlayers={squadPlayers}
            nameDisplayOption={nameDisplayOption}
            onRemoveFromBench={removeFromBench}
          />

          {/* Available Players Panel - Show ALL squad players */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Available Players ({availablePlayersForSelection.length})
                <Badge variant="outline" className="text-xs">
                  All squad players shown regardless of availability
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {availablePlayersForSelection.map((player) => (
                  <div
                    key={player.id}
                    className={`p-3 border rounded-lg cursor-grab active:cursor-grabbing ${getPlayerBorderStyle(player)}`}
                  >
                    <PlayerIcon
                      player={player}
                      nameDisplayOption={nameDisplayOption}
                      draggable
                    />
                    <div className="mt-1 flex flex-col items-center gap-1">
                      {getPlayerAvailabilityBadge(player)}
                      {globalCaptainId === player.id && (
                        <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800">
                          Captain
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {availablePlayersForSelection.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>All squad players have been assigned to positions or bench</p>
                </div>
              )}
            </CardContent>
          </Card>

          <DragOverlay>
            {activePlayer && (
              <PlayerIcon
                player={activePlayer}
                nameDisplayOption={nameDisplayOption}
              />
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Captain Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Team Captain Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={globalCaptainId || 'no-captain'} onValueChange={onCaptainChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select team captain" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no-captain">No Captain Selected</SelectItem>
              {squadPlayers.map((player) => (
                <SelectItem key={player.id} value={player.id}>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">#{player.squadNumber}</Badge>
                    {player.name}
                    {getPlayerAvailabilityBadge(player)}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  );
};
