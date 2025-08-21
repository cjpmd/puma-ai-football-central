-- Phase 3: Team Integration & Analytics
-- Add team-wide individual training coordination
CREATE TABLE IF NOT EXISTS public.team_individual_training_overview (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES auth.users(id),
  analytics_summary JSONB NOT NULL DEFAULT '{}',
  team_goals TEXT[],
  focus_areas_summary JSONB NOT NULL DEFAULT '{}',
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add individual training analytics
CREATE TABLE IF NOT EXISTS public.individual_training_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.individual_training_plans(id) ON DELETE CASCADE,
  analytics_period_start DATE NOT NULL,
  analytics_period_end DATE NOT NULL,
  total_sessions_planned INTEGER NOT NULL DEFAULT 0,
  total_sessions_completed INTEGER NOT NULL DEFAULT 0,
  completion_rate DECIMAL(5,2) DEFAULT 0.00,
  average_session_duration INTEGER DEFAULT 0, -- minutes
  improvement_metrics JSONB NOT NULL DEFAULT '{}',
  focus_area_progress JSONB NOT NULL DEFAULT '{}',
  coach_rating DECIMAL(3,2), -- 1.00 to 5.00
  self_assessment JSONB NOT NULL DEFAULT '{}',
  recommendations_applied INTEGER DEFAULT 0,
  milestones_achieved INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add team coach dashboard data
CREATE TABLE IF NOT EXISTS public.team_coaching_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES auth.users(id),
  insight_type TEXT NOT NULL CHECK (insight_type IN ('player_progress', 'team_trends', 'focus_area_analysis', 'recommendation')),
  insight_data JSONB NOT NULL DEFAULT '{}',
  priority_level TEXT NOT NULL DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high', 'critical')),
  action_required BOOLEAN NOT NULL DEFAULT false,
  addressed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT now() + INTERVAL '30 days',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add performance correlation tracking
CREATE TABLE IF NOT EXISTS public.individual_performance_correlations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  training_period_start DATE NOT NULL,
  training_period_end DATE NOT NULL,
  match_performance_data JSONB NOT NULL DEFAULT '{}',
  training_metrics JSONB NOT NULL DEFAULT '{}',
  correlation_scores JSONB NOT NULL DEFAULT '{}', -- e.g., {"ball_control": 0.75, "fitness": 0.82}
  improvement_areas TEXT[],
  confidence_level DECIMAL(3,2) DEFAULT 0.50,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.team_individual_training_overview ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.individual_training_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_coaching_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.individual_performance_correlations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Team Training Overview
CREATE POLICY "TITO: view team overview"
ON public.team_individual_training_overview
FOR SELECT
USING (
  is_global_admin_secure() OR
  coach_id = auth.uid() OR
  is_team_member_secure(team_id, ARRAY['team_manager', 'team_assistant_manager', 'team_coach'])
);

CREATE POLICY "TITO: manage team overview"
ON public.team_individual_training_overview
FOR ALL
USING (
  is_global_admin_secure() OR
  coach_id = auth.uid() OR
  is_team_member_secure(team_id, ARRAY['team_manager', 'team_assistant_manager', 'team_coach'])
)
WITH CHECK (
  is_global_admin_secure() OR
  coach_id = auth.uid() OR
  is_team_member_secure(team_id, ARRAY['team_manager', 'team_assistant_manager', 'team_coach'])
);

-- RLS Policies for Training Analytics
CREATE POLICY "ITA: view analytics"
ON public.individual_training_analytics
FOR SELECT
USING (
  is_global_admin_secure() OR
  EXISTS (
    SELECT 1 FROM public.user_players up
    WHERE up.player_id = individual_training_analytics.player_id AND up.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.players p
    JOIN public.user_teams ut ON ut.team_id = p.team_id
    WHERE p.id = individual_training_analytics.player_id 
    AND ut.user_id = auth.uid() 
    AND ut.role = ANY(ARRAY['team_manager', 'team_assistant_manager', 'team_coach'])
  )
);

CREATE POLICY "ITA: manage analytics"
ON public.individual_training_analytics
FOR ALL
USING (
  is_global_admin_secure() OR
  EXISTS (
    SELECT 1 FROM public.players p
    JOIN public.user_teams ut ON ut.team_id = p.team_id
    WHERE p.id = individual_training_analytics.player_id 
    AND ut.user_id = auth.uid() 
    AND ut.role = ANY(ARRAY['team_manager', 'team_assistant_manager', 'team_coach'])
  )
)
WITH CHECK (
  is_global_admin_secure() OR
  EXISTS (
    SELECT 1 FROM public.players p
    JOIN public.user_teams ut ON ut.team_id = p.team_id
    WHERE p.id = individual_training_analytics.player_id 
    AND ut.user_id = auth.uid() 
    AND ut.role = ANY(ARRAY['team_manager', 'team_assistant_manager', 'team_coach'])
  )
);

-- RLS Policies for Coaching Insights
CREATE POLICY "TCI: view insights"
ON public.team_coaching_insights
FOR SELECT
USING (
  is_global_admin_secure() OR
  coach_id = auth.uid() OR
  is_team_member_secure(team_id, ARRAY['team_manager', 'team_assistant_manager', 'team_coach'])
);

CREATE POLICY "TCI: manage insights"
ON public.team_coaching_insights
FOR ALL
USING (
  is_global_admin_secure() OR
  coach_id = auth.uid() OR
  is_team_member_secure(team_id, ARRAY['team_manager', 'team_assistant_manager', 'team_coach'])
)
WITH CHECK (
  is_global_admin_secure() OR
  coach_id = auth.uid() OR
  is_team_member_secure(team_id, ARRAY['team_manager', 'team_assistant_manager', 'team_coach'])
);

-- RLS Policies for Performance Correlations
CREATE POLICY "IPC: view correlations"
ON public.individual_performance_correlations
FOR SELECT
USING (
  is_global_admin_secure() OR
  EXISTS (
    SELECT 1 FROM public.user_players up
    WHERE up.player_id = individual_performance_correlations.player_id AND up.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.players p
    JOIN public.user_teams ut ON ut.team_id = p.team_id
    WHERE p.id = individual_performance_correlations.player_id 
    AND ut.user_id = auth.uid() 
    AND ut.role = ANY(ARRAY['team_manager', 'team_assistant_manager', 'team_coach'])
  )
);

CREATE POLICY "IPC: manage correlations"
ON public.individual_performance_correlations
FOR ALL
USING (
  is_global_admin_secure() OR
  EXISTS (
    SELECT 1 FROM public.players p
    JOIN public.user_teams ut ON ut.team_id = p.team_id
    WHERE p.id = individual_performance_correlations.player_id 
    AND ut.user_id = auth.uid() 
    AND ut.role = ANY(ARRAY['team_manager', 'team_assistant_manager', 'team_coach'])
  )
)
WITH CHECK (
  is_global_admin_secure() OR
  EXISTS (
    SELECT 1 FROM public.players p
    JOIN public.user_teams ut ON ut.team_id = p.team_id
    WHERE p.id = individual_performance_correlations.player_id 
    AND ut.user_id = auth.uid() 
    AND ut.role = ANY(ARRAY['team_manager', 'team_assistant_manager', 'team_coach'])
  )
);

-- Add indexes for performance
CREATE INDEX idx_team_individual_training_overview_team_id ON public.team_individual_training_overview(team_id);
CREATE INDEX idx_team_individual_training_overview_coach_id ON public.team_individual_training_overview(coach_id);
CREATE INDEX idx_individual_training_analytics_player_id ON public.individual_training_analytics(player_id);
CREATE INDEX idx_individual_training_analytics_plan_id ON public.individual_training_analytics(plan_id);
CREATE INDEX idx_individual_training_analytics_period ON public.individual_training_analytics(analytics_period_start, analytics_period_end);
CREATE INDEX idx_team_coaching_insights_team_id ON public.team_coaching_insights(team_id);
CREATE INDEX idx_team_coaching_insights_coach_id ON public.team_coaching_insights(coach_id);
CREATE INDEX idx_team_coaching_insights_expires_at ON public.team_coaching_insights(expires_at);
CREATE INDEX idx_individual_performance_correlations_player_id ON public.individual_performance_correlations(player_id);
CREATE INDEX idx_individual_performance_correlations_period ON public.individual_performance_correlations(training_period_start, training_period_end);

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_individual_training_analytics_updated_at
  BEFORE UPDATE ON public.individual_training_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();