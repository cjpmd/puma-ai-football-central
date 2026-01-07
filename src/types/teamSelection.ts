
export interface SquadPlayer {
  id: string;
  name: string;
  squadNumber: number;
  type: 'goalkeeper' | 'outfield';
  availabilityStatus: 'available' | 'unavailable' | 'pending' | 'maybe';
  squadRole: 'player' | 'captain' | 'vice_captain';
  photo_url?: string;
}

export interface PositionSlot {
  id: string;
  positionName: string;
  abbreviation: string;
  positionGroup: 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
  playerId?: string;
  x: number;
  y: number;
}

export interface FormationPeriod {
  id: string;
  periodNumber: number;
  formation: string;
  duration: number;
  positions: PositionSlot[];
  substitutes: string[];
  captainId?: string;
}

export interface TeamSelectionState {
  teamId: string;
  eventId: string;
  squadPlayers: SquadPlayer[];
  periods: FormationPeriod[];
  globalCaptainId?: string;
}
