export interface User {
  id: string;
  email: string;
  name?: string;
  roles?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface Team {
  id: string;
  name: string;
  age_group?: string;
  season_start?: string;
  season_end?: string;
  logo_url?: string;
  game_format?: string;
  subscription_type?: string;
  manager_name?: string;
  manager_email?: string;
  manager_phone?: string;
  created_at?: string;
  updated_at?: string;
  club_id?: string;
  performance_categories?: string[];
  kit_icons?: {
    home?: string;
    away?: string;
  };
}

export interface Club {
  id: string;
  name: string;
  logo_url?: string;
  created_at?: string;
  updated_at?: string;
  subscription_type?: string;
  reference_number?: string;
  serial_number?: string;
}

export interface Player {
  id: string;
  name: string;
  squad_number: number;
  date_of_birth: string;
  team_id: string;
  status?: string;
  subscription_type?: string;
  subscription_status?: string;
  photo_url?: string;
  availability?: string;
  attributes?: any[];
  objectives?: any[];
  comments?: any[];
  match_stats?: any;
  parent_id?: string;
  created_at?: string;
  updated_at?: string;
  leave_date?: string;
  leave_comments?: string;
  performance_category_id?: string;
  type?: string;
  play_style?: string;
  card_design_id?: string;
  linking_code?: string;
  kit_sizes?: any;
  fun_stats?: any;
}

export interface Event {
  id: string;
  team_id: string;
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  type: 'game' | 'training' | 'other';
  is_recurring?: boolean;
  recurrence_rule?: string;
  created_at?: string;
  updated_at?: string;
  mandatory?: boolean;
  attendance?: {
    [player_id: string]: 'confirmed' | 'maybe' | 'declined' | 'pending';
  };
  notes?: {
    [player_id: string]: string;
  };
}

export interface EventSelection {
  id: string;
  event_id: string;
  player_id: string;
  status: 'confirmed' | 'maybe' | 'declined' | 'pending';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  team_id: string;
  email?: string;
  phone?: string;
  photo_url?: string;
  bio?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PerformanceCategory {
  id: string;
  name: string;
  description?: string;
  team_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface Parent {
  id: string;
  name: string;
  email: string;
  phone?: string;
  playerId?: string;
  subscriptionType?: string;
  subscriptionStatus?: string;
  linkCode?: string;
  createdAt?: string;
  updatedAt?: string;
  isUserLinked?: boolean;
  userId?: string;
  relationship?: string;
}

export interface CardDesign {
  id: string;
  name: string;
  team_id: string;
  background_color: string;
  text_color: string;
  font_family: string;
  border_style: string;
  border_color: string;
  layout_style: string;
  created_at?: string;
  updated_at?: string;
}

export interface Attendance {
  id: string;
  event_id: string;
  player_id: string;
  status: 'confirmed' | 'maybe' | 'declined' | 'pending';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}
