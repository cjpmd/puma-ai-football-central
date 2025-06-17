
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
              [{ x: 50, y: 10 }], // Forward
              [{ x: 25, y: 25 }, { x: 50, y: 25 }, { x: 75, y: 25 }], // Attacking midfield
              [{ x: 50, y: 45 }], // Defensive midfield
              [{ x: 50, y: 65 }], // Defense
              [{ x: 50, y: 85 }] // Goalkeeper
            ];
          case '2-3-1':
            return [
              [{ x: 50, y: 10 }], // Forward
              [{ x: 25, y: 25 }, { x: 50, y: 25 }, { x: 75, y: 25 }], // Midfield
              [{ x: 30, y: 55 }, { x: 70, y: 55 }], // Defense
              [{ x: 50, y: 85 }] // Goalkeeper
            ];
          case '3-2-1':
            return [
              [{ x: 50, y: 10 }], // Forward
              [{ x: 35, y: 25 }, { x: 65, y: 25 }], // Midfield
              [{ x: 25, y: 55 }, { x: 50, y: 55 }, { x: 75, y: 55 }], // Defense
              [{ x: 50, y: 85 }] // Goalkeeper
            ];
          case 'all':
            // All formation - spread players more evenly
            return [
              [{ x: 35, y: 10 }, { x: 65, y: 10 }], // Forwards
              [{ x: 25, y: 25 }, { x: 50, y: 25 }, { x: 75, y: 25 }], // Attacking midfield
              [{ x: 35, y: 45 }, { x: 65, y: 45 }], // Defensive midfield
              [{ x: 20, y: 65 }, { x: 50, y: 65 }, { x: 80, y: 65 }], // Defense
              [{ x: 50, y: 85 }] // Goalkeeper
            ];
          default:
            return [[{ x: 50, y: 50 }]];
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
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 border border-white rounded-full opacity-90"></div>
              <div className="absolute top-1/2 left-0 right-0 h-px bg-white opacity-90"></div>
              
              {/* Goal areas */}
              <div className="absolute top-0 left-1/4 right-1/4 h-4 border-l border-r border-white opacity-80"></div>
              <div className="absolute bottom-0 left-1/4 right-1/4 h-4 border-l border-r border-white opacity-80"></div>
              
              {/* Corner arcs */}
              <div className="absolute top-0 left-0 w-2 h-2 border-r border-b border-white rounded-br opacity-60"></div>
              <div className="absolute top-0 right-0 w-2 h-2 border-l border-b border-white rounded-bl opacity-60"></div>
              <div className="absolute bottom-0 left-0 w-2 h-2 border-r border-t border-white rounded-tr opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-2 h-2 border-l border-t border-white rounded-tl opacity-60"></div>
              
              {/* Player positions */}
              {formationLayout.map((line, lineIndex) => 
                line.map((position, posIndex) => (
                  <div 
                    key={`${lineIndex}-${posIndex}`}
                    className="absolute w-2.5 h-2.5 bg-blue-600 rounded-full border border-white shadow-sm transform -translate-x-1/2 -translate-y-1/2"
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
