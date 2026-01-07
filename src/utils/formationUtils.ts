import { GameFormat } from '@/types';

export interface FormationConfig {
  id: string;
  name: string;
  positions: Array<{
    position: string;
    x: number;
    y: number;
  }>;
}

const formations3ASide: FormationConfig[] = [
  {
    id: "2-1",
    name: "2-1",
    positions: [
      { position: "Defender Left", x: 25, y: 75 },
      { position: "Defender Right", x: 75, y: 75 },
      { position: "Midfielder Centre", x: 50, y: 25 }
    ]
  }
];

const formations4ASide: FormationConfig[] = [
  {
    id: "1-2-1",
    name: "1-2-1",
    positions: [
      { position: "Defender Centre", x: 50, y: 80 },
      { position: "Midfielder Left", x: 25, y: 40 },
      { position: "Midfielder Right", x: 75, y: 40 },
      { position: "Attacking Midfielder Centre", x: 50, y: 15 }
    ]
  }
];

const formations5ASide: FormationConfig[] = [
  {
    id: "1-1-2-1",
    name: "1-1-2-1",
    positions: [
      { position: "Goalkeeper", x: 50, y: 90 },
      { position: "Defender Centre", x: 50, y: 60 },
      { position: "Midfielder Left", x: 25, y: 28 },
      { position: "Midfielder Right", x: 75, y: 28 },
      { position: "Attacking Midfielder Centre", x: 50, y: 13 }
    ]
  }
];

const formations7ASide: FormationConfig[] = [
  {
    id: "1-2-3-1",
    name: "1-2-3-1",
    positions: [
      { position: "Goalkeeper", x: 50, y: 88 },
      { position: "Defender Left", x: 28, y: 66 },
      { position: "Defender Right", x: 72, y: 66 },
      { position: "Midfielder Left", x: 22, y: 42 },
      { position: "Midfielder Centre", x: 50, y: 42 },
      { position: "Midfielder Right", x: 78, y: 42 },
      { position: "Striker Centre", x: 50, y: 18 }
    ]
  },
  {
    id: "1-3-2-1",
    name: "1-3-2-1",
    positions: [
      { position: "Goalkeeper", x: 50, y: 88 },
      { position: "Defender Left", x: 22, y: 64 },
      { position: "Defender Centre", x: 50, y: 64 },
      { position: "Defender Right", x: 78, y: 64 },
      { position: "Midfielder Left", x: 32, y: 40 },
      { position: "Midfielder Right", x: 68, y: 40 },
      { position: "Striker Centre", x: 50, y: 18 }
    ]
  },
  {
    id: "1-1-3-2",
    name: "1-1-3-2",
    positions: [
      { position: "Goalkeeper", x: 50, y: 88 },
      { position: "Defender Centre", x: 50, y: 66 },
      { position: "Midfielder Left", x: 22, y: 44 },
      { position: "Midfielder Centre", x: 50, y: 44 },
      { position: "Midfielder Right", x: 78, y: 44 },
      { position: "Striker Left", x: 35, y: 20 },
      { position: "Striker Right", x: 65, y: 20 }
    ]
  }
];

const formations9ASide: FormationConfig[] = [
  {
    id: "1-3-3-2",
    name: "1-3-3-2",
    positions: [
      { position: "Goalkeeper", x: 50, y: 88 },
      { position: "Defender Left", x: 22, y: 60 },
      { position: "Defender Centre", x: 50, y: 60 },
      { position: "Defender Right", x: 78, y: 60 },
      { position: "Midfielder Left", x: 22, y: 38 },
      { position: "Midfielder Centre", x: 50, y: 38 },
      { position: "Midfielder Right", x: 78, y: 38 },
      { position: "Striker Left", x: 35, y: 18 },
      { position: "Striker Right", x: 65, y: 18 }
    ]
  },
  {
    id: "1-3-4-1",
    name: "1-3-4-1",
    positions: [
      { position: "Goalkeeper", x: 50, y: 88 },
      { position: "Defender Left", x: 22, y: 60 },
      { position: "Defender Centre", x: 50, y: 60 },
      { position: "Defender Right", x: 78, y: 60 },
      { position: "Midfielder Left", x: 20, y: 40 },
      { position: "Midfielder Centre Left", x: 40, y: 40 },
      { position: "Midfielder Centre Right", x: 60, y: 40 },
      { position: "Midfielder Right", x: 80, y: 40 },
      { position: "Striker Centre", x: 50, y: 16 }
    ]
  },
  {
    id: "1-2-3-2-1",
    name: "1-2-3-2-1",
    positions: [
      { position: "Goalkeeper", x: 50, y: 88 },
      { position: "Defender Left", x: 30, y: 64 },
      { position: "Defender Right", x: 70, y: 64 },
      { position: "Midfielder Left", x: 22, y: 46 },
      { position: "Midfielder Centre", x: 50, y: 46 },
      { position: "Midfielder Right", x: 78, y: 46 },
      { position: "Attacking Midfielder Left", x: 35, y: 31 },
      { position: "Attacking Midfielder Right", x: 65, y: 31 },
      { position: "Striker Centre", x: 50, y: 14 }
    ]
  },
  {
    id: "1-2-4-2",
    name: "1-2-4-2",
    positions: [
      { position: "Goalkeeper", x: 50, y: 88 },
      { position: "Defender Left", x: 30, y: 64 },
      { position: "Defender Right", x: 70, y: 64 },
      { position: "Midfielder Left", x: 20, y: 42 },
      { position: "Midfielder Centre Left", x: 40, y: 42 },
      { position: "Midfielder Centre Right", x: 60, y: 42 },
      { position: "Midfielder Right", x: 80, y: 42 },
      { position: "Striker Left", x: 35, y: 18 },
      { position: "Striker Right", x: 65, y: 18 }
    ]
  }
];

const formations11ASide: FormationConfig[] = [
  {
    id: "1-4-4-2",
    name: "1-4-4-2",
    positions: [
      { position: "Goalkeeper", x: 50, y: 88 },
      { position: "Defender Left", x: 20, y: 62 },
      { position: "Defender Centre Left", x: 40, y: 62 },
      { position: "Defender Centre Right", x: 60, y: 62 },
      { position: "Defender Right", x: 80, y: 62 },
      { position: "Midfielder Left", x: 20, y: 42 },
      { position: "Midfielder Centre Left", x: 40, y: 42 },
      { position: "Midfielder Centre Right", x: 60, y: 42 },
      { position: "Midfielder Right", x: 80, y: 42 },
      { position: "Striker Centre Left", x: 40, y: 20 },
      { position: "Striker Centre Right", x: 60, y: 20 }
    ]
  },
  {
    id: "1-4-3-3",
    name: "1-4-3-3",
    positions: [
      { position: "Goalkeeper", x: 50, y: 88 },
      { position: "Defender Left", x: 20, y: 62 },
      { position: "Defender Centre Left", x: 40, y: 62 },
      { position: "Defender Centre Right", x: 60, y: 62 },
      { position: "Defender Right", x: 80, y: 62 },
      { position: "Midfielder Centre Left", x: 32, y: 44 },
      { position: "Midfielder Centre", x: 50, y: 44 },
      { position: "Midfielder Centre Right", x: 68, y: 44 },
      { position: "Attacking Midfielder Left", x: 22, y: 25 },
      { position: "Striker Centre", x: 50, y: 20 },
      { position: "Attacking Midfielder Right", x: 78, y: 25 }
    ]
  },
  {
    id: "1-4-2-3-1",
    name: "1-4-2-3-1",
    positions: [
      { position: "Goalkeeper", x: 50, y: 88 },
      { position: "Defender Left", x: 20, y: 62 },
      { position: "Defender Centre Left", x: 40, y: 62 },
      { position: "Defender Centre Right", x: 60, y: 62 },
      { position: "Defender Right", x: 80, y: 62 },
      { position: "Defensive Midfielder Left", x: 40, y: 46 },
      { position: "Defensive Midfielder Right", x: 60, y: 46 },
      { position: "Attacking Midfielder Left", x: 22, y: 31 },
      { position: "Attacking Midfielder Centre", x: 50, y: 31 },
      { position: "Attacking Midfielder Right", x: 78, y: 31 },
      { position: "Striker Centre", x: 50, y: 14 }
    ]
  },
  {
    id: "1-4-1-4-1",
    name: "1-4-1-4-1",
    positions: [
      { position: "Goalkeeper", x: 50, y: 88 },
      { position: "Defender Left", x: 20, y: 62 },
      { position: "Defender Centre Left", x: 40, y: 62 },
      { position: "Defender Centre Right", x: 60, y: 62 },
      { position: "Defender Right", x: 80, y: 62 },
      { position: "Defensive Midfielder Centre", x: 50, y: 48 },
      { position: "Attacking Midfielder Left", x: 20, y: 33 },
      { position: "Attacking Midfielder Centre Left", x: 40, y: 33 },
      { position: "Attacking Midfielder Centre Right", x: 60, y: 33 },
      { position: "Attacking Midfielder Right", x: 80, y: 33 },
      { position: "Striker Centre", x: 50, y: 14 }
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

export const getPositionsForFormation = (formationId: string, gameFormat: GameFormat): Array<{position: string; x: number; y: number}> => {
  const gameFormatFormations = getFormationsByFormat(gameFormat);
  const formation = gameFormatFormations.find(f => f.id === formationId);
  return formation?.positions || [];
};
