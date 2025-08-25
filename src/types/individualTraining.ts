export interface IndividualTrainingPlan {
  id: string;
  player_id?: string; // Optional for group plans
  player_ids?: string[]; // For group plans
  coach_id?: string;
  title: string;
  objective_text?: string;
  plan_type: 'self' | 'coach' | 'ai';
  status: 'draft' | 'active' | 'completed' | 'archived';
  visibility: 'private' | 'coach' | 'teamStaff';
  start_date: string;
  end_date: string;
  weekly_sessions: number;
  focus_areas: string[];
  accountability: Record<string, any>;
  is_group_plan: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Extended interface for group plans display
export interface GroupTrainingPlan extends IndividualTrainingPlan {
  players: Array<{
    id: string;
    name: string;
    squad_number?: number;
  }>;
  player_count: number;
}

export interface IndividualTrainingSession {
  id: string;
  plan_id: string;
  title: string;
  description?: string;
  day_of_week?: number; // 0-6, Sunday = 0
  planned_date?: string;
  target_duration_minutes: number;
  intensity: number; // 1-5
  location: 'home' | 'pitch' | 'gym';
  warmup_drill_ids: string[];
  cooldown_drill_ids: string[];
  session_order: number;
  created_at: string;
  updated_at: string;
}

export interface IndividualSessionDrill {
  id: string;
  session_id: string;
  drill_id?: string;
  custom_drill_name?: string;
  custom_drill_description?: string;
  target_repetitions?: number;
  target_duration_minutes?: number;
  target_metrics: Record<string, any>;
  progression_level: number; // 1-3
  sequence_order: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Populated from join
  drill?: {
    id: string;
    name: string;
    description?: string;
    duration_minutes?: number;
    difficulty_level?: string;
    drill_tags?: Array<{ id: string; name: string; color: string }>;
  };
}

export interface IndividualSessionCompletion {
  id: string;
  session_id: string;
  player_id: string;
  completed_date: string;
  actual_duration_minutes?: number;
  rpe?: number; // 1-10 Rate of Perceived Exertion
  notes?: string;
  drill_results: Record<string, any>;
  video_evidence_urls: string[];
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface IndividualPlanWithSessions extends IndividualTrainingPlan {
  sessions: IndividualTrainingSession[];
}

export interface IndividualSessionWithDrills extends IndividualTrainingSession {
  drills: IndividualSessionDrill[];
  completion?: IndividualSessionCompletion;
}

export interface DrillWithTags {
  id: string;
  name: string;
  description?: string;
  duration_minutes?: number;
  difficulty_level?: string;
  is_public: boolean;
  created_by: string;
  drill_tags?: Array<{ id: string; name: string; color: string }>;
}

// Phase 2: Coach Assignment & AI Integration Types
export interface IndividualPlanAssignment {
  id: string;
  plan_id: string;
  assigned_by: string;
  assigned_at: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  coach_notes?: string;
  player_feedback?: string;
  created_at: string;
  updated_at: string;
}

export interface AITrainingRecommendation {
  id: string;
  player_id: string;
  recommendation_data: Record<string, any>;
  focus_areas: string[];
  difficulty_level: number; // 1-5
  recommended_drills: string[];
  reasoning?: string;
  confidence_score?: number; // 0-1
  status: 'pending' | 'applied' | 'dismissed';
  created_at: string;
  expires_at: string;
}

export interface IndividualProgressMilestone {
  id: string;
  plan_id: string;
  milestone_name: string;
  target_value?: number;
  current_value: number;
  unit?: string; // 'minutes', 'repetitions', 'accuracy_percentage'
  achieved_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Phase 3: Team Integration & Analytics Types
export interface TeamIndividualTrainingOverview {
  id: string;
  team_id: string;
  coach_id: string;
  analytics_summary: Record<string, any>;
  team_goals: string[];
  focus_areas_summary: Record<string, any>;
  last_updated: string;
  created_at: string;
}

export interface IndividualTrainingAnalytics {
  id: string;
  player_id: string;
  plan_id?: string;
  analytics_period_start: string;
  analytics_period_end: string;
  total_sessions_planned: number;
  total_sessions_completed: number;
  completion_rate: number;
  average_session_duration: number; // minutes
  improvement_metrics: Record<string, any>;
  focus_area_progress: Record<string, any>;
  coach_rating?: number; // 1.00 to 5.00
  self_assessment: Record<string, any>;
  recommendations_applied: number;
  milestones_achieved: number;
  created_at: string;
  updated_at: string;
}

export interface TeamCoachingInsight {
  id: string;
  team_id: string;
  coach_id: string;
  insight_type: 'player_progress' | 'team_trends' | 'focus_area_analysis' | 'recommendation';
  insight_data: Record<string, any>;
  priority_level: 'low' | 'medium' | 'high' | 'critical';
  action_required: boolean;
  addressed_at?: string;
  expires_at: string;
  created_at: string;
}

export interface IndividualPerformanceCorrelation {
  id: string;
  player_id: string;
  training_period_start: string;
  training_period_end: string;
  match_performance_data: Record<string, any>;
  training_metrics: Record<string, any>;
  correlation_scores: Record<string, number>; // e.g., {"ball_control": 0.75, "fitness": 0.82}
  improvement_areas: string[];
  confidence_level: number;
  created_at: string;
}

export interface PlanCreationData {
  title: string;
  objective_text?: string;
  plan_type: 'self' | 'coach' | 'ai';
  start_date: string;
  end_date: string;
  weekly_sessions: number;
  focus_areas: string[];
  visibility: 'private' | 'coach' | 'teamStaff';
  location_preference: 'home' | 'pitch' | 'gym';
  intensity_preference: number;
  is_group_plan?: boolean;
  player_ids?: string[]; // For group plans
}