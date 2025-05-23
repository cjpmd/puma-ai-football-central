
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
        <Card className={`w-24 h-32 ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}>
          <CardContent className="p-2 h-full flex flex-col">
            <div className="text-xs font-medium text-center mb-1">
              {formation.name}
            </div>
            <div className="flex-1 bg-green-100 border border-green-300 rounded relative">
              {/* Mini pitch with position dots */}
              <div className="absolute inset-1 flex flex-col justify-between">
                {/* Simple representation - just show number of positions */}
                <div className="flex justify-center">
                  <div className="w-1 h-1 bg-blue-600 rounded-full"></div>
                </div>
                <div className="flex justify-center space-x-1">
                  {formation.positions.slice(1, 4).map((_, i) => (
                    <div key={i} className="w-1 h-1 bg-blue-600 rounded-full"></div>
                  ))}
                </div>
                <div className="flex justify-center space-x-1">
                  {formation.positions.slice(4, 7).map((_, i) => (
                    <div key={i} className="w-1 h-1 bg-blue-600 rounded-full"></div>
                  ))}
                </div>
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
      <label className="text-sm font-medium">Formation</label>
      <div className="flex space-x-2 justify-center">
        {formations.map(renderMiniPitch)}
      </div>
    </div>
  );
};
