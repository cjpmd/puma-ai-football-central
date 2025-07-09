import React, { useState, useCallback } from 'react';
import { useDrag } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PositionSlot } from './PositionSlot';
import { SquadPlayer } from '@/types/teamSelection';
import { GameFormat } from '@/types';
import { getPositionsForFormation, getFormationsByFormat } from '@/utils/formationUtils';
import { NameDisplayOption } from '@/types/team';

interface FormationPosition {
  id: string;
  positionName: string;
  abbreviation: string;
  positionGroup: string;
  x: number;
  y: number;
  playerId?: string;
}

export interface FormationPeriod {
  id: string;
  periodNumber: number;
  formation: string;
  duration: number;
  positions: FormationPosition[];
  substitutes: string[];
  captainId?: string;
}

interface DragDropFormationEditorProps {
  squadPlayers: SquadPlayer[];
  periods: FormationPeriod[];
  gameFormat: GameFormat;
  globalCaptainId?: string;
  nameDisplayOption?: NameDisplayOption;
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
  const [formationName, setFormationName] = useState(periods[currentPeriodIndex]?.formation || getFormationsByFormat(gameFormat)[0]?.id || '4-3-3');
  const [periodDuration, setPeriodDuration] = useState(periods[currentPeriodIndex]?.duration || gameDuration);

  const currentPeriod = periods[currentPeriodIndex] || {
    id: `period-${periods.length + 1}`,
    periodNumber: periods.length + 1,
    formation: formationName,
    duration: periodDuration,
    positions: getPositionsForFormation(formationName, gameFormat).map((pos, index) => ({
      id: `position-${index}`,
      positionName: pos.position,
      abbreviation: pos.abbreviation || pos.position?.substring(0, 2) || '',
      positionGroup: pos.positionGroup || 'midfielder',
      x: pos.x || 50,
      y: pos.y || 50,
    })),
    substitutes: [],
    captainId: globalCaptainId
  };

  const handleFormationChange = (newFormation: string) => {
    setFormationName(newFormation);
    
    const newPositions = getPositionsForFormation(newFormation, gameFormat).map((pos, index) => ({
      id: `position-${index}`,
      positionName: pos.position,
      abbreviation: pos.abbreviation || pos.position?.substring(0, 2) || '',
      positionGroup: pos.positionGroup || 'midfielder',
      x: pos.x || 50,
      y: pos.y || 50,
    }));

    const updatedPeriods = periods.map((period, index) =>
      index === currentPeriodIndex ? { ...period, formation: newFormation, positions: newPositions } : period
    );

    onPeriodsChange(updatedPeriods);
  };

  const handleDurationChange = (newDuration: number) => {
    setPeriodDuration(newDuration);

    const updatedPeriods = periods.map((period, index) =>
      index === currentPeriodIndex ? { ...period, duration: newDuration } : period
    );

    onPeriodsChange(updatedPeriods);
  };

  const addPeriod = () => {
    const newPeriodNumber = periods.length + 1;
    const newPeriod: FormationPeriod = {
      id: `period-${newPeriodNumber}`,
      periodNumber: newPeriodNumber,
      formation: formationName,
      duration: periodDuration,
      positions: getPositionsForFormation(formationName, gameFormat).map((pos, index) => ({
        id: `position-${index}`,
        positionName: pos.position,
        abbreviation: pos.abbreviation || pos.position?.substring(0, 2) || '',
        positionGroup: pos.positionGroup || 'midfielder',
        x: pos.x || 50,
        y: pos.y || 50,
      })),
      substitutes: [],
      captainId: globalCaptainId
    };

    onPeriodsChange([...periods, newPeriod]);
    setCurrentPeriodIndex(periods.length);
  };

  const updatePosition = (positionId: string, updates: Partial<FormationPosition>) => {
    const updatedPositions = currentPeriod.positions.map(pos =>
      pos.id === positionId ? { ...pos, ...updates } : pos
    );

    const updatedPeriod = { ...currentPeriod, positions: updatedPositions };
    const updatedPeriods = periods.map((period, index) =>
      index === currentPeriodIndex ? updatedPeriod : period
    );

    onPeriodsChange(updatedPeriods);
  };

  const handlePlayerDrop = useCallback(
    (positionId: string, playerId: string | null) => {
      updatePosition(positionId, { playerId });
    },
    [currentPeriod, periods, currentPeriodIndex, onPeriodsChange]
  );

  const { attributes, listeners } = useDrag({
    id: 'draggable',
    data: {
      player: 'test'
    }
  });

  const renderFormationField = (currentPeriod: FormationPeriod) => {
    const handleDragOver = (e: any) => {
      e.preventDefault();
    };

    const handleDrop = (e: any, positionId: string) => {
      e.preventDefault();
      const playerId = e.dataTransfer.getData('playerId');
      handlePlayerDrop(positionId, playerId);
    };

    return (
      <div className="relative bg-green-100 rounded-lg p-4 h-80 border overflow-hidden">
        {/* Football pitch markings */}
        <div className="absolute inset-0 bg-gradient-to-b from-green-200 to-green-300 rounded-lg opacity-30" />
        
        {/* Center circle and halfway line */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 border-2 border-white rounded-full opacity-50" />
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white opacity-50" />
        
        {/* Penalty boxes */}
        <div className="absolute top-2 left-1/4 right-1/4 h-8 border-l-2 border-r-2 border-white opacity-50" />
        <div className="absolute bottom-2 left-1/4 right-1/4 h-8 border-l-2 border-r-2 border-white opacity-50" />

        {/* Player positions */}
        {currentPeriod.positions.map((position) => {
          const player = position.playerId ? squadPlayers.find(p => p.id === position.playerId) : undefined;
          const isCaptain = globalCaptainId === position.playerId;
          
          return (
            <PositionSlot
              key={position.id}
              id={position.id}
              position={position}
              player={player}
              isCaptain={isCaptain}
              nameDisplayOption={nameDisplayOption}
              isLarger={false}
            />
          );
        })}

        {/* Draggable players overlay */}
        <div
          className="absolute inset-0 z-10"
          onDragOver={handleDragOver}
        >
          {currentPeriod.positions.map((position) => (
            <div
              key={position.id}
              className="absolute w-14 h-14 rounded-full"
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              onDrop={(e) => handleDrop(e, position.id)}
              onDragOver={handleDragOver}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Formation & Periods</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="formation">Formation:</Label>
              <Input
                type="text"
                id="formation"
                value={formationName}
                onChange={(e) => setFormationName(e.target.value)}
              />
              <Button onClick={() => handleFormationChange(formationName)}>Update Formation</Button>
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="duration">Period Duration:</Label>
              <Input
                type="number"
                id="duration"
                value={periodDuration}
                onChange={(e) => setPeriodDuration(parseInt(e.target.value))}
              />
              <Button onClick={() => handleDurationChange(periodDuration)}>Update Duration</Button>
            </div>
          </div>

          <Tabs defaultValue={currentPeriodIndex.toString()} className="space-y-4">
            <TabsList>
              {periods.map((period, index) => (
                <TabsTrigger key={period.id} value={index.toString()}>
                  Period {period.periodNumber}
                </TabsTrigger>
              ))}
              <Button onClick={addPeriod}>Add Period</Button>
            </TabsList>
            {periods.map((period, index) => (
              <TabsContent key={period.id} value={index.toString()}>
                {renderFormationField(period)}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
