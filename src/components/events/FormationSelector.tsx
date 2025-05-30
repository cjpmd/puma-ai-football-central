
import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getFormationsByFormat, FormationConfig } from '@/utils/formationUtils';
import { GameFormat } from '@/types';

interface FormationSelectorProps {
  gameFormat: GameFormat;
  selectedFormation: string;
  onFormationChange: (formationId: string) => void;
}

export const FormationSelector: React.FC<FormationSelectorProps> = ({
  gameFormat,
  selectedFormation,
  onFormationChange
}) => {
  const formations = getFormationsByFormat(gameFormat);

  const renderMiniPitch = (formation: FormationConfig) => {
    const isSelected = selectedFormation === formation.id;
    
    // Create a simple visual representation of positions based on the pitch layout
    const getPositionLayout = (positions: string[]) => {
      const maxPlayers = parseInt(gameFormat.split('-')[0]);
      
      if (maxPlayers === 3) {
        // 3-a-side: 2-1 formation
        return [
          positions.filter(p => p === 'MC'), // Forward line
          positions.filter(p => ['DL', 'DR'].includes(p)) // Defense line
        ];
      } else if (maxPlayers === 4) {
        // 4-a-side: 1-2-1 formation
        return [
          positions.filter(p => p === 'AMC'), // Forward
          positions.filter(p => ['ML', 'MR'].includes(p)), // Midfield
          positions.filter(p => p === 'DC') // Defense
        ];
      } else if (maxPlayers === 5) {
        // 5-a-side formations
        return [
          positions.filter(p => p === 'AMC'), // Forward
          positions.filter(p => ['ML', 'MR'].includes(p)), // Midfield
          positions.filter(p => p === 'DC'), // Defense
          positions.filter(p => p === 'GK') // Goalkeeper
        ];
      } else if (maxPlayers === 7) {
        // 7-a-side formations
        switch (formation.id) {
          case '1-1-3-1':
            return [
              positions.filter(p => p === 'STC'), // Forward
              positions.filter(p => ['AML', 'AMC', 'AMR'].includes(p)), // Attacking midfield
              positions.filter(p => p === 'DM'), // Defensive midfield
              positions.filter(p => p === 'DC'), // Defense
              positions.filter(p => p === 'GK') // Goalkeeper
            ];
          case '2-3-1':
            return [
              positions.filter(p => p === 'STC'), // Forward
              positions.filter(p => ['ML', 'MC', 'MR'].includes(p)), // Midfield
              positions.filter(p => ['DL', 'DR'].includes(p)), // Defense
              positions.filter(p => p === 'GK') // Goalkeeper
            ];
          case '3-2-1':
            return [
              positions.filter(p => p === 'STC'), // Forward
              positions.filter(p => ['MCL', 'MCR'].includes(p)), // Midfield
              positions.filter(p => ['DL', 'DC', 'DR'].includes(p)), // Defense
              positions.filter(p => p === 'GK') // Goalkeeper
            ];
          default:
            return [
              positions.slice(1, 3), // Forwards
              positions.slice(3, 6), // Midfield
              positions.slice(6, 8), // Defense
              ['GK'] // Goalkeeper
            ];
        }
      } else if (maxPlayers === 9) {
        // 9-a-side formations
        switch (formation.id) {
          case '3-2-3':
            return [
              positions.filter(p => ['STL', 'STR'].includes(p)), // Forwards
              positions.filter(p => p === 'AMC'), // Attacking midfield
              positions.filter(p => ['MCL', 'MCR'].includes(p)), // Central midfield
              positions.filter(p => ['DL', 'DC', 'DR'].includes(p)), // Defense
              positions.filter(p => p === 'GK') // Goalkeeper
            ];
          case '2-4-2':
            return [
              positions.filter(p => p === 'STC'), // Forward
              positions.filter(p => p === 'AMC'), // Attacking midfield
              positions.filter(p => ['DM', 'ML', 'MR'].includes(p)), // Midfield
              positions.filter(p => ['DCL', 'DCR'].includes(p)), // Defense
              positions.filter(p => p === 'GK') // Goalkeeper
            ];
          case '3-3-2':
            return [
              positions.filter(p => ['STL', 'STR'].includes(p)), // Forwards
              positions.filter(p => ['ML', 'MC', 'MR'].includes(p)), // Midfield
              positions.filter(p => ['DL', 'DC', 'DR'].includes(p)), // Defense
              positions.filter(p => p === 'GK') // Goalkeeper
            ];
          default:
            return [
              positions.slice(1, 4), // Forwards
              positions.slice(4, 7), // Midfield
              positions.slice(7, 9), // Defense
              ['GK'] // Goalkeeper
            ];
        }
      } else if (maxPlayers === 11) {
        // 11-a-side formations
        return [
          positions.slice(9, 11), // Forwards
          positions.slice(6, 9), // Midfield
          positions.slice(1, 5), // Defense
          [positions[0]] // Goalkeeper
        ];
      }
      
      // Default layout
      return [
        [positions[1] || ''], 
        [positions[2] || '', positions[3] || ''], 
        [positions[4] || '', positions[5] || ''], 
        ['GK']
      ];
    };

    const positionLayout = getPositionLayout(formation.positions);
    
    return (
      <div
        key={formation.id}
        className={`cursor-pointer transition-all duration-200 ${
          isSelected ? 'scale-105' : 'hover:scale-102'
        }`}
        onClick={() => onFormationChange(formation.id)}
      >
        <Card className={`w-28 h-36 ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}>
          <CardContent className="p-2 h-full flex flex-col">
            <div className="text-xs font-medium text-center mb-1">
              {formation.name}
            </div>
            <div className="flex-1 bg-green-100 border border-green-300 rounded relative overflow-hidden">
              {/* Mini pitch with position representation */}
              <div className="absolute inset-1 flex flex-col justify-between h-full">
                {positionLayout.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex justify-center space-x-1">
                    {row.map((position, posIndex) => (
                      <div 
                        key={`${position}-${posIndex}`} 
                        className="w-1.5 h-1.5 bg-blue-600 rounded-full"
                        title={position}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            {isSelected && (
              <Badge variant="default" className="text-xs mt-1">
                Selected
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Formation Selection ({gameFormat})</label>
      <div className="flex space-x-2 justify-center p-4 bg-gray-50 rounded-lg flex-wrap">
        {formations.map(renderMiniPitch)}
      </div>
      {selectedFormation && (
        <div className="text-center text-sm text-muted-foreground">
          Selected: {formations.find(f => f.id === selectedFormation)?.name || selectedFormation}
        </div>
      )}
    </div>
  );
};
