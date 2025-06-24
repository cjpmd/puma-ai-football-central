
export interface DatabaseEvent {
  id: string;
  team_id: string;
  title: string;
  description?: string;
  date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  notes?: string;
  event_type: 'training' | 'match' | 'fixture' | 'tournament' | 'festival' | 'social' | 'friendly';
  opponent?: string;
  is_home?: boolean;
  game_format?: string;
  game_duration?: number; // Added game duration in minutes
  scores?: {
    home: number;
    away: number;
  };
  player_of_match_id?: string;
  coach_notes?: string;
  staff_notes?: string;
  training_notes?: string;
  facility_id?: string;
  facility_booking_id?: string;
  meeting_time?: string;
  total_minutes?: number;
  teams?: string[];
  kit_selection?: 'home' | 'away' | 'training';
  created_at: string;
  updated_at: string;
}

export interface DatabasePlayer {
  id: string;
  name: string;
  date_of_birth?: string;
  squad_number?: number;
  type?: 'goalkeeper' | 'outfield';
  availability?: 'green' | 'amber' | 'red';
  team_id: string;
  status?: string;
  subscription_status?: string;
  subscription_type?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseStaff {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  team_id: string;
  user_id?: string;
  linking_code?: string;
  coaching_badges?: any[];
  certificates?: any[];
  pvg_checked?: boolean;
  pvg_checked_at?: string;
  pvg_checked_by?: string;
  created_at: string;
  updated_at: string;
}
