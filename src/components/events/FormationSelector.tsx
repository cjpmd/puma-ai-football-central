
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
    
    // Create a visual representation based on formation layout
    const getFormationLayout = (formation: FormationConfig) => {
      const maxPlayers = parseInt(gameFormat.split('-')[0]);
      
      if (maxPlayers === 7) {
        // 7-a-side formations
        switch (formation.id) {
          case '1-1-3-1':
            return [
              [{ x: 50, y: 15 }], // Forward
              [{ x: 25, y: 35 }, { x: 50, y: 35 }, { x: 75, y: 35 }], // Attacking midfield
              [{ x: 50, y: 55 }], // Defensive midfield
              [{ x: 50, y: 75 }], // Defense
              [{ x: 50, y: 90 }] // Goalkeeper
            ];
          case '2-3-1':
            return [
              [{ x: 50, y: 15 }], // Forward
              [{ x: 25, y: 35 }, { x: 50, y: 35 }, { x: 75, y: 35 }], // Midfield
              [{ x: 30, y: 65 }, { x: 70, y: 65 }], // Defense
              [{ x: 50, y: 90 }] // Goalkeeper
            ];
          case '3-2-1':
            return [
              [{ x: 50, y: 15 }], // Forward
              [{ x: 35, y: 35 }, { x: 65, y: 35 }], // Midfield
              [{ x: 25, y: 65 }, { x: 50, y: 65 }, { x: 75, y: 65 }], // Defense
              [{ x: 50, y: 90 }] // Goalkeeper
            ];
          default:
            // All formation - spread players evenly
            return [
              [{ x: 35, y: 15 }, { x: 65, y: 15 }], // Forwards
              [{ x: 25, y: 35 }, { x: 50, y: 35 }, { x: 75, y: 35 }], // Midfield
              [{ x: 35, y: 65 }, { x: 65, y: 65 }], // Defense
              [{ x: 50, y: 90 }] // Goalkeeper
            ];
        }
      }
      
      // Default fallback for other formats
      return [[{ x: 50, y: 50 }]];
    };

    const formationLayout = getFormationLayout(formation);
    
    return (
      <div
        key={formation.id}
        className={`cursor-pointer transition-all duration-200 ${
          isSelected ? 'scale-105' : 'hover:scale-102'
        }`}
        onClick={() => onFormationChange(formation.id)}
      >
        <Card className={`w-32 h-40 ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}>
          <CardContent className="p-2 h-full flex flex-col">
            <div className="text-xs font-medium text-center mb-2 text-gray-800">
              {formation.name}
            </div>
            <div className="flex-1 bg-green-400 border-2 border-green-600 rounded relative overflow-hidden">
              {/* Pitch markings */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 border border-white rounded-full opacity-80"></div>
              <div className="absolute top-1/2 left-0 right-0 h-px bg-white opacity-80"></div>
              <div className="absolute top-0 left-1/4 right-1/4 h-3 border-l border-r border-white opacity-60"></div>
              <div className="absolute bottom-0 left-1/4 right-1/4 h-3 border-l border-r border-white opacity-60"></div>
              
              {/* Player positions */}
              {formationLayout.map((line, lineIndex) => 
                line.map((position, posIndex) => (
                  <div 
                    key={`${lineIndex}-${posIndex}`}
                    className="absolute w-2 h-2 bg-blue-700 rounded-full border border-white shadow-sm transform -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${position.x}%`,
                      top: `${position.y}%`
                    }}
                  />
                ))
              )}
            </div>
            {isSelected && (
              <div className="text-center mt-1">
                <Badge variant="default" className="text-xs">
                  Selected
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <label className="text-sm font-medium text-gray-700">Formation Selection ({gameFormat})</label>
      <div className="flex gap-3 justify-start p-4 bg-gray-50 rounded-lg flex-wrap overflow-x-auto">
        {formations
          .filter(form => form.id && form.id.trim() !== '')
          .map(renderMiniPitch)}
      </div>
      {selectedFormation && (
        <div className="text-center text-sm text-muted-foreground">
          Selected: {formations.find(f => f.id === selectedFormation)?.name || selectedFormation}
        </div>
      )}
    </div>
  );
};
