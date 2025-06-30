
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
    
    return (
      <div
        key={formation.id}
        className={`cursor-pointer transition-all duration-200 ${
          isSelected ? 'scale-105' : 'hover:scale-102'
        }`}
        onClick={() => onFormationChange(formation.id)}
      >
        <Card className={`w-40 h-48 ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}>
          <CardContent className="p-2 h-full flex flex-col">
            <div className="text-sm font-medium text-center mb-2 text-gray-800">
              {formation.name}
            </div>
            <div className="flex-1 bg-green-400 border-2 border-green-600 rounded relative overflow-hidden">
              {/* Pitch markings */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 border border-white rounded-full opacity-90"></div>
              <div className="absolute top-1/2 left-0 right-0 h-px bg-white opacity-90"></div>
              
              {/* Goal areas */}
              <div className="absolute top-0 left-1/4 right-1/4 h-6 border-l border-r border-white opacity-80"></div>
              <div className="absolute bottom-0 left-1/4 right-1/4 h-6 border-l border-r border-white opacity-80"></div>
              
              {/* Corner arcs */}
              <div className="absolute top-0 left-0 w-3 h-3 border-r border-b border-white rounded-br opacity-60"></div>
              <div className="absolute top-0 right-0 w-3 h-3 border-l border-b border-white rounded-bl opacity-60"></div>
              <div className="absolute bottom-0 left-0 w-3 h-3 border-r border-t border-white rounded-tr opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-3 h-3 border-l border-t border-white rounded-tl opacity-60"></div>
              
              {/* Player positions */}
              {formation.positions.map((position, index) => (
                <div 
                  key={`${formation.id}-${index}`}
                  className="absolute w-3 h-3 bg-blue-600 rounded-full border border-white shadow-sm transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${position.x}%`,
                    top: `${position.y}%`
                  }}
                  title={position.position}
                />
              ))}
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
