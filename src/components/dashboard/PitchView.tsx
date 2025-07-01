import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { GameFormat, Formation, Position } from '@/types';

interface PitchViewProps {
  formation: Formation;
  gameFormat: GameFormat;
  selectedPlayers: any[];
  onPlayerClick?: (playerId: string) => void;
}

export const PitchView: React.FC<PitchViewProps> = ({ 
  formation, 
  gameFormat, 
  selectedPlayers, 
  onPlayerClick 
}) => {
  const [currentFormation, setCurrentFormation] = useState<Formation>(formation || '4-4-2');

  const formations: Record<Formation, Position[]> = {
    '4-4-2': ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST'],
    '4-3-3': ['GK', 'LB', 'CB', 'CB', 'RB', 'CM', 'CM', 'CM', 'LW', 'ST', 'RW'],
    '3-5-2': ['GK', 'CB', 'CB', 'CB', 'LM', 'CM', 'CM', 'CM', 'RM', 'ST', 'ST'],
    '4-2-3-1': ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CDM', 'CAM', 'CAM', 'CAM', 'ST'],
    '5-3-2': ['GK', 'CB', 'CB', 'CB', 'CB', 'CB', 'CM', 'CM', 'CM', 'ST', 'ST'],
    '3-4-3': ['GK', 'CB', 'CB', 'CB', 'LM', 'CM', 'CM', 'RM', 'LW', 'ST', 'RW'],
    '1-1-3-1': ['SK', 'DL', 'DCL', 'DC', 'DCR', 'DR'],
    '2-3-1': ['GK', 'CB', 'CB', 'CM', 'CM', 'CM', 'ST'],
    '3-2-1': ['GK', 'CB', 'CB', 'CB', 'CM', 'CM', 'ST'],
    '3-2-3': ['GK', 'CB', 'CB', 'CB', 'CM', 'CM', 'LW', 'ST', 'RW'],
    '2-4-2': ['GK', 'CB', 'CB', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST'],
    '3-3-2': ['GK', 'CB', 'CB', 'CB', 'CM', 'CM', 'CM', 'ST', 'ST'],
    'custom': ['GK', 'CB', 'CM', 'ST']
  };

  const positionCoordinates: Record<Position, { x: number; y: number }> = {
    GK: { x: 50, y: 10 },
    CB: { x: 50, y: 25 },
    LB: { x: 20, y: 25 },
    RB: { x: 80, y: 25 },
    CM: { x: 50, y: 50 },
    LM: { x: 20, y: 50 },
    RM: { x: 80, y: 50 },
    CAM: { x: 50, y: 65 },
    CDM: { x: 50, y: 35 },
    LW: { x: 20, y: 75 },
    RW: { x: 80, y: 75 },
    ST: { x: 50, y: 85 },
    CF: { x: 50, y: 80 },
    SK: { x: 50, y: 10 },
    DL: { x: 20, y: 25 },
    DCL: { x: 35, y: 25 },
    DC: { x: 50, y: 25 },
    DCR: { x: 65, y: 25 },
    DR: { x: 80, y: 25 },
    WBL: { x: 15, y: 40 },
    DCML: { x: 35, y: 40 },
    DCM: { x: 50, y: 40 },
    DCMR: { x: 65, y: 40 },
    WBR: { x: 85, y: 40 },
    ML: { x: 20, y: 55 },
    MCL: { x: 35, y: 55 },
    MC: { x: 50, y: 55 },
    MCR: { x: 65, y: 55 },
    MR: { x: 80, y: 55 },
    AML: { x: 20, y: 70 },
    AMCL: { x: 35, y: 70 },
    AMC: { x: 50, y: 70 },
    AMCR: { x: 65, y: 70 },
    AMR: { x: 80, y: 70 },
    STCL: { x: 35, y: 85 },
    STC: { x: 50, y: 85 },
    STCR: { x: 65, y: 85 },
    STL: { x: 35, y: 85 },
    STR: { x: 65, y: 85 },
    DM: { x: 50, y: 35 }
  };

  const positions = formations[currentFormation];

  return (
    <div className="relative w-full h-[500px] bg-green-500 rounded-md overflow-hidden">
      {positions?.map((position, index) => {
        const coordinate = positionCoordinates[position];
        const player = selectedPlayers[index];

        return (
          <div
            key={index}
            className="absolute rounded-full flex items-center justify-center cursor-pointer"
            style={{
              left: `calc(${coordinate.x}% - 20px)`,
              top: `calc(${coordinate.y}% - 20px)`,
            }}
            onClick={() => player?.id && onPlayerClick?.(player.id)}
          >
            <Avatar className="w-10 h-10">
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>{player?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="absolute bottom-0 bg-secondary text-secondary-foreground text-xs rounded-md p-1">
              {position}
            </div>
          </div>
        );
      })}
    </div>
  );
};
