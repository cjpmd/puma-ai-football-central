
import { GameFormat, Formation, Position } from '@/types';

export interface FormationConfig {
  id: string;
  name: string;
  positions: Position[];
}

const formations3ASide: FormationConfig[] = [
  {
    id: "2-1",
    name: "2-1",
    positions: ["DL", "DR", "MC"]
  }
];

const formations4ASide: FormationConfig[] = [
  {
    id: "1-2-1",
    name: "1-2-1",
    positions: ["DC", "ML", "MR", "AMC"]
  }
];

const formations5ASide: FormationConfig[] = [
  {
    id: "1-1-2-1",
    name: "1-1-2-1",
    positions: ["GK", "DC", "ML", "MR", "AMC"]
  },
  {
    id: "all",
    name: "All",
    positions: ["GK", "DC", "ML", "MR", "AMC"]
  }
];

const formations7ASide: FormationConfig[] = [
  {
    id: "1-1-3-1",
    name: "1-1-3-1",
    positions: ["GK", "DC", "DM", "AML", "AMC", "AMR", "STC"]
  },
  {
    id: "2-3-1", 
    name: "2-3-1",
    positions: ["GK", "DL", "DR", "ML", "MC", "MR", "STC"]
  },
  {
    id: "3-2-1",
    name: "3-2-1", 
    positions: ["GK", "DL", "DC", "DR", "MCL", "MCR", "STC"]
  },
  {
    id: "all",
    name: "All",
    positions: ["GK", "DL", "DC", "DR", "DM", "ML", "MC", "MR", "AML", "AMC", "AMR", "STC"]
  }
];

const formations9ASide: FormationConfig[] = [
  {
    id: "3-2-3",
    name: "3-2-3",
    positions: ["GK", "DL", "DC", "DR", "MCL", "MCR", "AMC", "STL", "STR"]
  },
  {
    id: "2-4-2",
    name: "2-4-2", 
    positions: ["GK", "DCL", "DCR", "DM", "ML", "MR", "AMC", "STC"]
  },
  {
    id: "3-3-2",
    name: "3-3-2",
    positions: ["GK", "DL", "DC", "DR", "ML", "MC", "MR", "STL", "STR"]
  },
  {
    id: "all",
    name: "All", 
    positions: ["GK", "DL", "DC", "DR", "DCL", "DCR", "DM", "ML", "MC", "MR", "MCL", "MCR", "AMC", "STL", "STC", "STR"]
  }
];

const formations11ASide: FormationConfig[] = [
  {
    id: "1-4-4-2",
    name: "1-4-4-2",
    positions: ["GK", "DL", "DCL", "DCR", "DR", "ML", "MCL", "MCR", "MR", "STCL", "STCR"]
  },
  {
    id: "1-4-3-3",
    name: "1-4-3-3",
    positions: ["GK", "DL", "DCL", "DCR", "DR", "MCL", "MC", "MCR", "AML", "STC", "AMR"]
  },
  {
    id: "1-4-2-3-1",
    name: "1-4-2-3-1",
    positions: ["GK", "DL", "DCL", "DCR", "DR", "MCL", "MCR", "AML", "AMC", "AMR", "STC"]
  },
  {
    id: "1-3-4-3",
    name: "1-3-4-3",
    positions: ["GK", "DL", "DC", "DR", "ML", "MCL", "MCR", "MR", "AML", "STC", "AMR"]
  }
];

export const getFormationsByFormat = (gameFormat: GameFormat): FormationConfig[] => {
  const maxPlayers = parseInt(gameFormat.split('-')[0]);
  
  switch (maxPlayers) {
    case 3:
      return formations3ASide;
    case 4:
      return formations4ASide;
    case 5:
      return formations5ASide;
    case 7:
      return formations7ASide;
    case 9:
      return formations9ASide;
    case 11:
      return formations11ASide;
    default:
      return [];
  }
};

export const getPositionsForFormation = (formationId: string, gameFormat: GameFormat): Position[] => {
  const formations = getFormationsByFormat(gameFormat);
  const formation = formations.find(f => f.id === formationId);
  return formation?.positions || [];
};
