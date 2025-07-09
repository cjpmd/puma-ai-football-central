
import { GameFormat } from '@/types';

export interface FormationPosition {
  position: string;
  abbreviation: string;
  positionGroup: 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
  x: number;
  y: number;
}

export interface FormationConfig {
  id: string;
  name: string;
  positions: FormationPosition[];
}

const formations3ASide: FormationConfig[] = [
  {
    id: "2-1",
    name: "2-1",
    positions: [
      { position: "Defender Left", abbreviation: "DL", positionGroup: "defender", x: 25, y: 75 },
      { position: "Defender Right", abbreviation: "DR", positionGroup: "defender", x: 75, y: 75 },
      { position: "Midfielder Centre", abbreviation: "MC", positionGroup: "midfielder", x: 50, y: 25 }
    ]
  }
];

const formations4ASide: FormationConfig[] = [
  {
    id: "1-2-1",
    name: "1-2-1",
    positions: [
      { position: "Defender Centre", abbreviation: "DC", positionGroup: "defender", x: 50, y: 80 },
      { position: "Midfielder Left", abbreviation: "ML", positionGroup: "midfielder", x: 25, y: 40 },
      { position: "Midfielder Right", abbreviation: "MR", positionGroup: "midfielder", x: 75, y: 40 },
      { position: "Attacking Midfielder Centre", abbreviation: "AMC", positionGroup: "midfielder", x: 50, y: 15 }
    ]
  }
];

const formations5ASide: FormationConfig[] = [
  {
    id: "1-1-2-1",
    name: "1-1-2-1",
    positions: [
      { position: "Goalkeeper", abbreviation: "GK", positionGroup: "goalkeeper", x: 50, y: 90 },
      { position: "Defender Centre", abbreviation: "DC", positionGroup: "defender", x: 50, y: 70 },
      { position: "Midfielder Left", abbreviation: "ML", positionGroup: "midfielder", x: 25, y: 35 },
      { position: "Midfielder Right", abbreviation: "MR", positionGroup: "midfielder", x: 75, y: 35 },
      { position: "Attacking Midfielder Centre", abbreviation: "AMC", positionGroup: "midfielder", x: 50, y: 15 }
    ]
  }
];

const formations7ASide: FormationConfig[] = [
  {
    id: "1-2-3-1",
    name: "1-2-3-1",
    positions: [
      { position: "Goalkeeper", abbreviation: "GK", positionGroup: "goalkeeper", x: 50, y: 90 },
      { position: "Defender Left", abbreviation: "DL", positionGroup: "defender", x: 20, y: 70 },
      { position: "Defender Right", abbreviation: "DR", positionGroup: "defender", x: 80, y: 70 },
      { position: "Midfielder Left", abbreviation: "ML", positionGroup: "midfielder", x: 15, y: 45 },
      { position: "Midfielder Centre", abbreviation: "MC", positionGroup: "midfielder", x: 50, y: 45 },
      { position: "Midfielder Right", abbreviation: "MR", positionGroup: "midfielder", x: 85, y: 45 },
      { position: "Striker Centre", abbreviation: "SC", positionGroup: "forward", x: 50, y: 10 }
    ]
  },
  {
    id: "1-3-2-1",
    name: "1-3-2-1",
    positions: [
      { position: "Goalkeeper", abbreviation: "GK", positionGroup: "goalkeeper", x: 50, y: 90 },
      { position: "Defender Left", abbreviation: "DL", positionGroup: "defender", x: 15, y: 60 },
      { position: "Defender Centre", abbreviation: "DC", positionGroup: "defender", x: 50, y: 60 },
      { position: "Defender Right", abbreviation: "DR", positionGroup: "defender", x: 85, y: 60 },
      { position: "Midfielder Left", abbreviation: "ML", positionGroup: "midfielder", x: 25, y: 30 },
      { position: "Midfielder Right", abbreviation: "MR", positionGroup: "midfielder", x: 75, y: 30 },
      { position: "Striker Centre", abbreviation: "SC", positionGroup: "forward", x: 50, y: 10 }
    ]
  },
  {
    id: "1-1-3-2",
    name: "1-1-3-2",
    positions: [
      { position: "Goalkeeper", abbreviation: "GK", positionGroup: "goalkeeper", x: 50, y: 90 },
      { position: "Defender Centre", abbreviation: "DC", positionGroup: "defender", x: 50, y: 70 },
      { position: "Midfielder Left", abbreviation: "ML", positionGroup: "midfielder", x: 15, y: 45 },
      { position: "Midfielder Centre", abbreviation: "MC", positionGroup: "midfielder", x: 50, y: 45 },
      { position: "Midfielder Right", abbreviation: "MR", positionGroup: "midfielder", x: 85, y: 45 },
      { position: "Striker Left", abbreviation: "SL", positionGroup: "forward", x: 30, y: 15 },
      { position: "Striker Right", abbreviation: "SR", positionGroup: "forward", x: 70, y: 15 }
    ]
  }
];

const formations9ASide: FormationConfig[] = [
  {
    id: "1-3-3-2",
    name: "1-3-3-2",
    positions: [
      { position: "Goalkeeper", abbreviation: "GK", positionGroup: "goalkeeper", x: 50, y: 90 },
      { position: "Defender Left", abbreviation: "DL", positionGroup: "defender", x: 15, y: 75 },
      { position: "Defender Centre", abbreviation: "DC", positionGroup: "defender", x: 50, y: 75 },
      { position: "Defender Right", abbreviation: "DR", positionGroup: "defender", x: 85, y: 75 },
      { position: "Midfielder Left", abbreviation: "ML", positionGroup: "midfielder", x: 10, y: 50 },
      { position: "Midfielder Centre", abbreviation: "MC", positionGroup: "midfielder", x: 50, y: 50 },
      { position: "Midfielder Right", abbreviation: "MR", positionGroup: "midfielder", x: 90, y: 50 },
      { position: "Striker Left", abbreviation: "SL", positionGroup: "forward", x: 30, y: 15 },
      { position: "Striker Right", abbreviation: "SR", positionGroup: "forward", x: 70, y: 15 }
    ]
  }
];

const formations11ASide: FormationConfig[] = [
  {
    id: "1-4-4-2",
    name: "1-4-4-2",
    positions: [
      { position: "Goalkeeper", abbreviation: "GK", positionGroup: "goalkeeper", x: 50, y: 90 },
      { position: "Defender Left", abbreviation: "DL", positionGroup: "defender", x: 8, y: 75 },
      { position: "Defender Centre Left", abbreviation: "DCL", positionGroup: "defender", x: 30, y: 75 },
      { position: "Defender Centre Right", abbreviation: "DCR", positionGroup: "defender", x: 70, y: 75 },
      { position: "Defender Right", abbreviation: "DR", positionGroup: "defender", x: 92, y: 75 },
      { position: "Midfielder Left", abbreviation: "ML", positionGroup: "midfielder", x: 5, y: 50 },
      { position: "Midfielder Centre Left", abbreviation: "MCL", positionGroup: "midfielder", x: 30, y: 50 },
      { position: "Midfielder Centre Right", abbreviation: "MCR", positionGroup: "midfielder", x: 70, y: 50 },
      { position: "Midfielder Right", abbreviation: "MR", positionGroup: "midfielder", x: 95, y: 50 },
      { position: "Striker Centre Left", abbreviation: "SCL", positionGroup: "forward", x: 30, y: 15 },
      { position: "Striker Centre Right", abbreviation: "SCR", positionGroup: "forward", x: 70, y: 15 }
    ]
  },
  {
    id: "1-4-3-3",
    name: "1-4-3-3",
    positions: [
      { position: "Goalkeeper", abbreviation: "GK", positionGroup: "goalkeeper", x: 50, y: 90 },
      { position: "Defender Left", abbreviation: "DL", positionGroup: "defender", x: 8, y: 75 },
      { position: "Defender Centre Left", abbreviation: "DCL", positionGroup: "defender", x: 30, y: 75 },
      { position: "Defender Centre Right", abbreviation: "DCR", positionGroup: "defender", x: 70, y: 75 },
      { position: "Defender Right", abbreviation: "DR", positionGroup: "defender", x: 92, y: 75 },
      { position: "Midfielder Centre Left", abbreviation: "MCL", positionGroup: "midfielder", x: 25, y: 50 },
      { position: "Midfielder Centre", abbreviation: "MC", positionGroup: "midfielder", x: 50, y: 50 },
      { position: "Midfielder Centre Right", abbreviation: "MCR", positionGroup: "midfielder", x: 75, y: 50 },
      { position: "Attacking Midfielder Left", abbreviation: "AML", positionGroup: "forward", x: 15, y: 25 },
      { position: "Striker Centre", abbreviation: "SC", positionGroup: "forward", x: 50, y: 15 },
      { position: "Attacking Midfielder Right", abbreviation: "AMR", positionGroup: "forward", x: 85, y: 25 }
    ]
  }
];

export const formations: Record<string, FormationConfig[]> = {
  '3-a-side': formations3ASide,
  '4-a-side': formations4ASide,
  '5-a-side': formations5ASide,
  '7-a-side': formations7ASide,
  '9-a-side': formations9ASide,
  '11-a-side': formations11ASide,
};

export const getFormationsByFormat = (gameFormat: GameFormat): FormationConfig[] => {
  return formations[gameFormat] || formations['11-a-side'];
};

export const getPositionsForFormation = (formationId: string, gameFormat: GameFormat): FormationPosition[] => {
  const gameFormatFormations = getFormationsByFormat(gameFormat);
  const formation = gameFormatFormations.find(f => f.id === formationId);
  return formation?.positions || [];
};
