
export interface DatabaseEvent {
  id: string;
  team_id: string;
  title: string;
  description?: string;
  date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
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
  teams?: Array<{
    id: string;
    start_time?: string;
    meeting_time?: string;
  }> | string[];
  kit_selection?: 'home' | 'away' | 'training';
  created_at: string;
  updated_at: string;
}
