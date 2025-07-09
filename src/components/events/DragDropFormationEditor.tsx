
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SquadPlayer } from '@/types/teamSelection';
import { GameFormat } from '@/types';
import { getPositionsForFormation, getFormationsByFormat } from '@/utils/formationUtils';
import { NameDisplayOption } from '@/types/team';
import { X, Plus } from 'lucide-react';
import { formatPlayerName } from '@/utils/nameUtils';

interface FormationPosition {
  id: string;
  positionName: string;
  abbreviation: string;
  positionGroup: 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
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
  const availableFormations = getFormationsByFormat(gameFormat);
  
  const currentPeriod = periods[currentPeriodIndex];
  const [newFormation, setNewFormation] = useState(currentPeriod?.formation || availableFormations[0]?.id || '1-2-3-1');
  const [newDuration, setNewDuration] = useState(currentPeriod?.duration || Math.floor(gameDuration / Math.max(1, periods.length)));

  const addPeriod = () => {
    const newPeriodNumber = periods.length + 1;
    const positions = getPositionsForFormation(newFormation, gameFormat);
    
    const newPeriod: FormationPeriod = {
      id: `period-${newPeriodNumber}`,
      periodNumber: newPeriodNumber,
      formation: newFormation,
      duration: newDuration,
      positions: positions.map((pos, index) => ({
        id: `position-${newPeriodNumber}-${index}`,
        positionName: pos.position,
        abbreviation: pos.abbreviation,
        positionGroup: pos.positionGroup,
        x: pos.x,
        y: pos.y,
      })),
      substitutes: [],
      captainId: globalCaptainId
    };

    onPeriodsChange([...periods, newPeriod]);
    setCurrentPeriodIndex(periods.length);
  };

  const updatePeriod = (periodIndex: number, updates: Partial<FormationPeriod>) => {
    const updatedPeriods = periods.map((period, index) =>
      index === periodIndex ? { ...period, ...updates } : period
    );
    onPeriodsChange(updatedPeriods);
  };

  const removePeriod = (periodIndex: number) => {
    if (periods.length > 1) {
      const updatedPeriods = periods.filter((_, index) => index !== periodIndex);
      onPeriodsChange(updatedPeriods);
      if (currentPeriodIndex >= updatedPeriods.length) {
        setCurrentPeriodIndex(Math.max(0, updatedPeriods.length - 1));
      }
    }
  };

  const updateFormation = (formationId: string) => {
    if (!currentPeriod) return;
    
    const positions = getPositionsForFormation(formationId, gameFormat);
    const updatedPeriod = {
      ...currentPeriod,
      formation: formationId,
      positions: positions.map((pos, index) => ({
        id: `position-${currentPeriod.periodNumber}-${index}`,
        positionName: pos.position,
        abbreviation: pos.abbreviation,
        positionGroup: pos.positionGroup,
        x: pos.x,
        y: pos.y,
      }))
    };
    
    updatePeriod(currentPeriodIndex, updatedPeriod);
  };

  const updateDuration = (duration: number) => {
    if (!currentPeriod) return;
    updatePeriod(currentPeriodIndex, { duration });
  };

  const handlePlayerDrop = useCallback((positionId: string, playerId: string | null) => {
    if (!currentPeriod) return;
    
    const updatedPositions = currentPeriod.positions.map(pos =>
      pos.id === positionId ? { ...pos, playerId } : pos
    );
    
    updatePeriod(currentPeriodIndex, { positions: updatedPositions });
  }, [currentPeriod, currentPeriodIndex]);

  const renderFormationField = (period: FormationPeriod) => {
    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, positionId: string) => {
      e.preventDefault();
      const playerId = e.dataTransfer.getData('playerId');
      handlePlayerDrop(positionId, playerId);
    };

    return (
      <div className="flex-1">
        <div className="relative bg-gradient-to-b from-green-100 to-green-200 rounded-lg p-6 h-96 border-2 border-green-300 overflow-hidden">
          {/* Football pitch markings */}
          <div className="absolute inset-0 opacity-30">
            {/* Center circle */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 border-2 border-white rounded-full" />
            {/* Center dot */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full" />
            {/* Halfway line */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white" />
            {/* Goal areas */}
            <div className="absolute top-4 left-1/3 right-1/3 h-12 border-l-2 border-r-2 border-white" />
            <div className="absolute bottom-4 left-1/3 right-1/3 h-12 border-l-2 border-r-2 border-white" />
            {/* Penalty areas */}
            <div className="absolute top-2 left-1/4 right-1/4 h-16 border-l-2 border-r-2 border-white" />
            <div className="absolute bottom-2 left-1/4 right-1/4 h-16 border-l-2 border-r-2 border-white" />
          </div>

          {/* Player positions */}
          {period.positions.map((position) => {
            const player = position.playerId ? squadPlayers.find(p => p.id === position.playerId) : undefined;
            const isCaptain = globalCaptainId === position.playerId;
            
            return (
              <div
                key={position.id}
                className="absolute"
                style={{
                  left: `${position.x}%`,
                  top: `${position.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, position.id)}
              >
                <div className={`
                  flex flex-col items-center justify-center
                  w-16 h-16 rounded-full border-2 border-dashed
                  ${player ? 'border-solid bg-white/90' : 'border-white/60 bg-white/20'}
                  hover:border-white/80 hover:bg-white/30
                  transition-all duration-300 ease-out backdrop-blur-sm
                  text-center relative
                `}>
                  {player ? (
                    <>
                      {/* Captain indicator */}
                      {isCaptain && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-black">C</span>
                        </div>
                      )}
                      
                      {/* Position abbreviation */}
                      <div className="text-xs font-bold text-gray-700 mb-0.5">
                        {position.abbreviation}
                      </div>
                      
                      {/* Player name */}
                      <div className="text-xs font-medium text-center leading-tight">
                        {formatPlayerName(player.name, nameDisplayOption)}
                      </div>
                      
                      {/* Squad number */}
                      <div className="text-xs font-bold text-gray-600 mt-0.5">
                        #{player.squadNumber}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-xs font-bold text-gray-600 mb-1">
                        {position.abbreviation}
                      </div>
                      <div className="text-xs text-gray-500 text-center px-1">
                        {position.positionName}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (periods.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">No Periods Created</h3>
            <p className="text-muted-foreground mb-4">
              Create your first period to start building formations.
            </p>
          </div>
          
          <div className="space-y-4 max-w-md mx-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="formation">Formation</Label>
                <Select value={newFormation} onValueChange={setNewFormation}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFormations.map((formation) => (
                      <SelectItem key={formation.id} value={formation.id}>
                        {formation.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="duration">Duration (mins)</Label>
                <Input
                  type="number"
                  value={newDuration}
                  onChange={(e) => setNewDuration(parseInt(e.target.value) || 0)}
                  min={1}
                />
              </div>
            </div>
            
            <Button onClick={addPeriod} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Create First Period
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Formation Periods */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Formation Periods</CardTitle>
            <Button onClick={addPeriod} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Period
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6">
            {/* Left side - Formation Controls */}
            <div className="w-64 space-y-4">
              <div>
                <Label>Formation</Label>
                <Select 
                  value={currentPeriod?.formation || ''} 
                  onValueChange={updateFormation}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFormations.map((formation) => (
                      <SelectItem key={formation.id} value={formation.id}>
                        {formation.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={currentPeriod?.duration || 0}
                  onChange={(e) => updateDuration(parseInt(e.target.value) || 0)}
                  min={1}
                />
              </div>
            </div>

            {/* Right side - Period Tabs and Formation Display */}
            <div className="flex-1 flex flex-col">
              {/* Period Tabs */}
              <div className="flex gap-2 mb-4 flex-wrap">
                {periods.map((period, index) => (
                  <div key={period.id} className="relative">
                    <Button
                      variant={index === currentPeriodIndex ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPeriodIndex(index)}
                      className="pr-8"
                    >
                      Period {period.periodNumber} ({period.duration}min)
                    </Button>
                    {periods.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute -top-2 -right-2 h-5 w-5 p-0 bg-red-500 text-white rounded-full hover:bg-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          removePeriod(index);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Formation Display */}
              {currentPeriod && renderFormationField(currentPeriod)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
