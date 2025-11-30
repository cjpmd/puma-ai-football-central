export type MatchEventType = 'goal' | 'assist' | 'save' | 'yellow_card' | 'red_card' | 'substitution';

export interface MatchEvent {
  id: string;
  event_id: string;
  player_id: string;
  team_id: string;
  event_type: MatchEventType;
  minute?: number;
  period_number?: number;
  notes?: string;
  created_at: string;
  created_by?: string;
  players?: {
    id: string;
    name: string;
    squad_number: number;
  };
}

export interface PlayerCardStatus {
  hasYellow: boolean;
  hasRed: boolean;
}

export interface SubstitutionData {
  playerOffId: string;
  playerOnId: string;
  playerOffName?: string;
  playerOnName?: string;
}
