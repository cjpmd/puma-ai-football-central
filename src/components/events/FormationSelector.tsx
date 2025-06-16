
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
              [{ x: 25, y: 30 }, { x: 50, y: 30 }, { x: 75, y: 30 }], // Attacking midfield
              [{ x: 50, y: 50 }], // Defensive midfield
              [{ x: 50, y: 70 }], // Defense
              [{ x: 50, y: 90 }] // Goalkeeper
            ];
          case '2-3-1':
            return [
              [{ x: 50, y: 10 }], // Forward
              [{ x: 25, y: 30 }, { x: 50, y: 30 }, { x: 75, y: 30 }], // Midfield
              [{ x: 30, y: 60 }, { x: 70, y: 60 }], // Defense
              [{ x: 50, y: 90 }] // Goalkeeper
            ];
          case '3-2-1':
            return [
              [{ x: 50, y: 10 }], // Forward
              [{ x: 35, y: 30 }, { x: 65, y: 30 }], // Midfield
              [{ x: 25, y: 60 }, { x: 50, y: 60 }, { x: 75, y: 60 }], // Defense
              [{ x: 50, y: 90 }] // Goalkeeper
            ];
          default:
            // All formation - spread players evenly
            return [
              [{ x: 35, y: 10 }, { x: 65, y: 10 }], // Forwards
              [{ x: 25, y: 30 }, { x: 50, y: 30 }, { x: 75, y: 30 }], // Midfield
              [{ x: 35, y: 60 }, { x: 65, y: 60 }], // Defense
              [{ x: 50, y: 90 }] // Goalkeeper
            ];
        }
      } else if (maxPlayers === 5) {
        return [
          [{ x: 50, y: 15 }], // Forward
          [{ x: 30, y: 40 }, { x: 70, y: 40 }], // Midfield
          [{ x: 50, y: 65 }], // Defense
          [{ x: 50, y: 90 }] // Goalkeeper
        ];
      } else if (maxPlayers === 9) {
        switch (formation.id) {
          case '3-2-3':
            return [
              [{ x: 30, y: 10 }, { x: 70, y: 10 }], // Forwards
              [{ x: 50, y: 25 }], // Attacking midfield
              [{ x: 35, y: 45 }, { x: 65, y: 45 }], // Central midfield
              [{ x: 25, y: 70 }, { x: 50, y: 70 }, { x: 75, y: 70 }], // Defense
              [{ x: 50, y: 90 }] // Goalkeeper
            ];
          case '2-4-2':
            return [
              [{ x: 50, y: 10 }], // Forward
              [{ x: 50, y: 25 }], // Attacking midfield
              [{ x: 20, y: 45 }, { x: 50, y: 45 }, { x: 80, y: 45 }], // Midfield
              [{ x: 35, y: 70 }, { x: 65, y: 70 }], // Defense
              [{ x: 50, y: 90 }] // Goalkeeper
            ];
          case '3-3-2':
            return [
              [{ x: 35, y: 10 }, { x: 65, y: 10 }], // Forwards
              [{ x: 25, y: 35 }, { x: 50, y: 35 }, { x: 75, y: 35 }], // Midfield
              [{ x: 25, y: 70 }, { x: 50, y: 70 }, { x: 75, y: 70 }], // Defense
              [{ x: 50, y: 90 }] // Goalkeeper
            ];
          default:
            return [
              [{ x: 30, y: 10 }, { x: 70, y: 10 }], // Forwards
              [{ x: 25, y: 30 }, { x: 50, y: 30 }, { x: 75, y: 30 }], // Midfield
              [{ x: 25, y: 60 }, { x: 50, y: 60 }, { x: 75, y: 60 }], // Defense
              [{ x: 50, y: 90 }] // Goalkeeper
            ];
        }
      } else if (maxPlayers === 11) {
        return [
          [{ x: 40, y: 10 }, { x: 60, y: 10 }], // Forwards
          [{ x: 20, y: 30 }, { x: 40, y: 30 }, { x: 60, y: 30 }, { x: 80, y: 30 }], // Midfield
          [{ x: 15, y: 60 }, { x: 35, y: 60 }, { x: 65, y: 60 }, { x: 85, y: 60 }], // Defense
          [{ x: 50, y: 90 }] // Goalkeeper
        ];
      } else if (maxPlayers === 3) {
        return [
          [{ x: 50, y: 20 }], // Forward
          [{ x: 30, y: 60 }, { x: 70, y: 60 }] // Defense
        ];
      } else if (maxPlayers === 4) {
        return [
          [{ x: 50, y: 15 }], // Forward
          [{ x: 30, y: 40 }, { x: 70, y: 40 }], // Midfield
          [{ x: 50, y: 70 }] // Defense
        ];
      }
      
      // Default fallback
      return [[{ x: 50, y: 50 }]];
    };

    const formationLayout = getFormationLayout(formation);
    
    return (
      <div
        key={formation.id}
        className={`cursor-pointer transition-all duration-200 min-w-[120px] ${
          isSelected ? 'scale-105' : 'hover:scale-102'
        }`}
        onClick={() => onFormationChange(formation.id)}
      >
        <Card className={`w-full max-w-[120px] h-40 ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}>
          <CardContent className="p-3 h-full flex flex-col">
            <div className="text-xs font-medium text-center mb-2">
              {formation.name}
            </div>
            <div className="flex-1 bg-green-100 border border-green-300 rounded relative overflow-hidden">
              {/* Center circle */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 border border-green-400 rounded-full opacity-40"></div>
              
              {/* Halfway line */}
              <div className="absolute top-1/2 left-0 right-0 h-px bg-green-400 opacity-50"></div>
              
              {/* Player positions */}
              {formationLayout.map((line, lineIndex) => 
                line.map((position, posIndex) => (
                  <div 
                    key={`${lineIndex}-${posIndex}`}
                    className="absolute w-2 h-2 bg-blue-600 rounded-full border border-white shadow-sm"
                    style={{
                      left: `${position.x}%`,
                      top: `${position.y}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  />
                ))
              )}
              
              {/* Goal lines */}
              <div className="absolute top-0 left-1/4 right-1/4 h-px bg-green-400 opacity-60"></div>
              <div className="absolute bottom-0 left-1/4 right-1/4 h-px bg-green-400 opacity-60"></div>
              
              {/* Goal areas */}
              <div className="absolute top-0 left-3/8 right-3/8 h-3 border-l border-r border-green-400 opacity-40"></div>
              <div className="absolute bottom-0 left-3/8 right-3/8 h-3 border-l border-r border-green-400 opacity-40"></div>
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
    <div className="space-y-3">
      <label className="text-sm font-medium">Formation Selection ({gameFormat})</label>
      <div className="flex gap-3 justify-center p-4 bg-gray-50 rounded-lg flex-wrap">
        {formations
          .filter(form => form.id && form.id.trim() !== '') // Filter out formations with empty IDs
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
