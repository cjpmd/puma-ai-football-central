export type FormationPosition = {
  id: string;
  name: string;
  x: number; // Percentage position X (0-100)
  y: number; // Percentage position Y (0-100)
};

export type Formation = {
  id: string;
  name: string;
  gameFormat: '3-a-side' | '4-a-side' | '5-a-side' | '7-a-side' | '9-a-side' | '11-a-side';
  positions: FormationPosition[];
};

// 7-a-side formations
export const formations7ASide: Formation[] = [
  {
    id: '7-1-1-3-1',
    name: '1-1-3-1',
    gameFormat: '7-a-side',
    positions: [
      { id: 'GK', name: 'GK', x: 50, y: 90 },
      { id: 'DC', name: 'DC', x: 50, y: 70 },
      { id: 'DM', name: 'DM', x: 50, y: 55 },
      { id: 'AML', name: 'AML', x: 25, y: 30 },
      { id: 'AMC', name: 'AMC', x: 50, y: 30 },
      { id: 'AMR', name: 'AMR', x: 75, y: 30 },
      { id: 'STC', name: 'STC', x: 50, y: 10 }
    ]
  },
  {
    id: '7-2-3-1',
    name: '2-3-1',
    gameFormat: '7-a-side',
    positions: [
      { id: 'GK', name: 'GK', x: 50, y: 90 },
      { id: 'DL', name: 'DL', x: 30, y: 70 },
      { id: 'DR', name: 'DR', x: 70, y: 70 },
      { id: 'ML', name: 'ML', x: 20, y: 40 },
      { id: 'MC', name: 'MC', x: 50, y: 45 },
      { id: 'MR', name: 'MR', x: 80, y: 40 },
      { id: 'STC', name: 'STC', x: 50, y: 15 }
    ]
  },
  {
    id: '7-3-2-1',
    name: '3-2-1',
    gameFormat: '7-a-side',
    positions: [
      { id: 'GK', name: 'GK', x: 50, y: 90 },
      { id: 'DL', name: 'DL', x: 25, y: 70 },
      { id: 'DC', name: 'DC', x: 50, y: 70 },
      { id: 'DR', name: 'DR', x: 75, y: 70 },
      { id: 'MCL', name: 'MCL', x: 35, y: 40 },
      { id: 'MCR', name: 'MCR', x: 65, y: 40 },
      { id: 'STC', name: 'STC', x: 50, y: 15 }
    ]
  }
];

// 9-a-side formations
export const formations9ASide: Formation[] = [
  {
    id: '9-3-2-3',
    name: '3-2-3',
    gameFormat: '9-a-side',
    positions: [
      { id: 'GK', name: 'GK', x: 50, y: 90 },
      { id: 'DL', name: 'DL', x: 25, y: 75 },
      { id: 'DC', name: 'DC', x: 50, y: 75 },
      { id: 'DR', name: 'DR', x: 75, y: 75 },
      { id: 'MCL', name: 'MCL', x: 35, y: 55 },
      { id: 'MCR', name: 'MCR', x: 65, y: 55 },
      { id: 'AMC', name: 'AMC', x: 50, y: 30 },
      { id: 'STL', name: 'STL', x: 35, y: 15 },
      { id: 'STR', name: 'STR', x: 65, y: 15 }
    ]
  },
  {
    id: '9-2-4-2',
    name: '2-4-2',
    gameFormat: '9-a-side',
    positions: [
      { id: 'GK', name: 'GK', x: 50, y: 90 },
      { id: 'DCL', name: 'DCL', x: 40, y: 75 },
      { id: 'DCR', name: 'DCR', x: 60, y: 75 },
      { id: 'DM', name: 'DM', x: 50, y: 60 },
      { id: 'ML', name: 'ML', x: 20, y: 50 },
      { id: 'MR', name: 'MR', x: 80, y: 50 },
      { id: 'AMC', name: 'AMC', x: 50, y: 35 },
      { id: 'STC', name: 'STC', x: 50, y: 15 },
      { id: 'SS', name: 'SS', x: 50, y: 25 }
    ]
  },
  {
    id: '9-3-3-2',
    name: '3-3-2',
    gameFormat: '9-a-side',
    positions: [
      { id: 'GK', name: 'GK', x: 50, y: 90 },
      { id: 'DL', name: 'DL', x: 25, y: 75 },
      { id: 'DC', name: 'DC', x: 50, y: 75 },
      { id: 'DR', name: 'DR', x: 75, y: 75 },
      { id: 'ML', name: 'ML', x: 20, y: 50 },
      { id: 'MC', name: 'MC', x: 50, y: 50 },
      { id: 'MR', name: 'MR', x: 80, y: 50 },
      { id: 'STL', name: 'STL', x: 35, y: 15 },
      { id: 'STR', name: 'STR', x: 65, y: 15 }
    ]
  }
];

// Helper function to get formations by game format
export const getFormationsByFormat = (format: string) => {
  switch (format) {
    case '7-a-side':
      return formations7ASide;
    case '9-a-side':
      return formations9ASide;
    // Add other formats as needed
    default:
      return [];
  }
};

// Helper function to get all positions for a game format
export const getAllPositionsByFormat = (format: string): FormationPosition[] => {
  const uniquePositions = new Map<string, FormationPosition>();
  
  getFormationsByFormat(format).forEach(formation => {
    formation.positions.forEach(position => {
      if (!uniquePositions.has(position.id)) {
        uniquePositions.set(position.id, position);
      }
    });
  });
  
  return Array.from(uniquePositions.values());
};

// Define all positions used across all formations
export const allPositions: FormationPosition[] = [
  // Goalkeeper
  { id: 'GK', name: 'GK', x: 50, y: 90 },
  { id: 'SK', name: 'SK', x: 50, y: 85 },
  
  // Defense
  { id: 'DL', name: 'DL', x: 25, y: 75 },
  { id: 'DCL', name: 'DCL', x: 40, y: 75 },
  { id: 'DC', name: 'DC', x: 50, y: 75 },
  { id: 'DCR', name: 'DCR', x: 60, y: 75 },
  { id: 'DR', name: 'DR', x: 75, y: 75 },
  { id: 'WBL', name: 'WBL', x: 15, y: 65 },
  { id: 'WBR', name: 'WBR', x: 85, y: 65 },
  { id: 'DCML', name: 'DCML', x: 35, y: 65 },
  { id: 'DCM', name: 'DCM', x: 50, y: 65 },
  { id: 'DCMR', name: 'DCMR', x: 65, y: 65 },
  
  // Midfield
  { id: 'DM', name: 'DM', x: 50, y: 60 },
  { id: 'ML', name: 'ML', x: 20, y: 50 },
  { id: 'MCL', name: 'MCL', x: 35, y: 55 },
  { id: 'MC', name: 'MC', x: 50, y: 50 },
  { id: 'MCR', name: 'MCR', x: 65, y: 55 },
  { id: 'MR', name: 'MR', x: 80, y: 50 },
  
  // Attack
  { id: 'AML', name: 'AML', x: 25, y: 30 },
  { id: 'AMCL', name: 'AMCL', x: 35, y: 30 },
  { id: 'AMC', name: 'AMC', x: 50, y: 30 },
  { id: 'AMCR', name: 'AMCR', x: 65, y: 30 },
  { id: 'AMR', name: 'AMR', x: 75, y: 30 },
  { id: 'SS', name: 'SS', x: 50, y: 25 },
  { id: 'STL', name: 'STL', x: 35, y: 15 },
  { id: 'STC', name: 'STC', x: 50, y: 15 },
  { id: 'STR', name: 'STR', x: 65, y: 15 }
];
