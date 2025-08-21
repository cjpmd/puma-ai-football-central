-- Phase 2: Coach Assignment & AI Integration
-- Add coach assignment tracking
CREATE TABLE IF NOT EXISTS public.individual_plan_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.individual_training_plans(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed')),
  coach_notes TEXT,
  player_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add AI recommendation tracking
CREATE TABLE IF NOT EXISTS public.ai_training_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  recommendation_data JSONB NOT NULL DEFAULT '{}',
  focus_areas TEXT[] DEFAULT ARRAY[]::TEXT[],
  difficulty_level INTEGER NOT NULL DEFAULT 3 CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  recommended_drills UUID[] DEFAULT ARRAY[]::UUID[],
  reasoning TEXT,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT now() + INTERVAL '7 days'
);

-- Add progress tracking enhancements
CREATE TABLE IF NOT EXISTS public.individual_progress_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.individual_training_plans(id) ON DELETE CASCADE,
  milestone_name TEXT NOT NULL,
  target_value DECIMAL,
  current_value DECIMAL DEFAULT 0,
  unit TEXT, -- e.g., 'minutes', 'repetitions', 'accuracy_percentage'
  achieved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.individual_plan_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_training_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.individual_progress_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Plan Assignments
CREATE POLICY "IPA: view assignments"
ON public.individual_plan_assignments
FOR SELECT
USING (
  is_global_admin_secure() OR
  assigned_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.individual_training_plans p
    WHERE p.id = individual_plan_assignments.plan_id
    AND (
      p.coach_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.user_players up
        WHERE up.player_id = p.player_id AND up.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "IPA: manage assignments"
ON public.individual_plan_assignments
FOR ALL
USING (
  is_global_admin_secure() OR
  assigned_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.individual_training_plans p
    WHERE p.id = individual_plan_assignments.plan_id
    AND p.coach_id = auth.uid()
  )
)
WITH CHECK (
  is_global_admin_secure() OR
  assigned_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.individual_training_plans p
    WHERE p.id = individual_plan_assignments.plan_id
    AND p.coach_id = auth.uid()
  )
);

-- RLS Policies for AI Recommendations
CREATE POLICY "AIR: view recommendations"
ON public.ai_training_recommendations
FOR SELECT
USING (
  is_global_admin_secure() OR
  EXISTS (
    SELECT 1 FROM public.user_players up
    WHERE up.player_id = ai_training_recommendations.player_id AND up.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.players p
    JOIN public.user_teams ut ON ut.team_id = p.team_id
    WHERE p.id = ai_training_recommendations.player_id 
    AND ut.user_id = auth.uid() 
    AND ut.role = ANY(ARRAY['team_manager', 'team_assistant_manager', 'team_coach'])
  )
);

CREATE POLICY "AIR: manage recommendations"
ON public.ai_training_recommendations
FOR ALL
USING (
  is_global_admin_secure() OR
  EXISTS (
    SELECT 1 FROM public.user_players up
    WHERE up.player_id = ai_training_recommendations.player_id AND up.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.players p
    JOIN public.user_teams ut ON ut.team_id = p.team_id
    WHERE p.id = ai_training_recommendations.player_id 
    AND ut.user_id = auth.uid() 
    AND ut.role = ANY(ARRAY['team_manager', 'team_assistant_manager', 'team_coach'])
  )
)
WITH CHECK (
  is_global_admin_secure() OR
  EXISTS (
    SELECT 1 FROM public.user_players up
    WHERE up.player_id = ai_training_recommendations.player_id AND up.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.players p
    JOIN public.user_teams ut ON ut.team_id = p.team_id
    WHERE p.id = ai_training_recommendations.player_id 
    AND ut.user_id = auth.uid() 
    AND ut.role = ANY(ARRAY['team_manager', 'team_assistant_manager', 'team_coach'])
  )
);

-- RLS Policies for Progress Milestones
CREATE POLICY "IPM: view milestones"
ON public.individual_progress_milestones
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.individual_training_plans p
    WHERE p.id = individual_progress_milestones.plan_id
    AND (
      is_global_admin_secure() OR
      p.coach_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.user_players up
        WHERE up.player_id = p.player_id AND up.user_id = auth.uid()
      ) OR
      (p.visibility = ANY(ARRAY['coach', 'teamStaff']) AND
       EXISTS (
         SELECT 1 FROM public.players pl
         JOIN public.user_teams ut ON ut.team_id = pl.team_id
         WHERE pl.id = p.player_id 
         AND ut.user_id = auth.uid() 
         AND ut.role = ANY(ARRAY['team_manager', 'team_assistant_manager', 'team_coach'])
       ))
    )
  )
);

CREATE POLICY "IPM: manage milestones"
ON public.individual_progress_milestones
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.individual_training_plans p
    WHERE p.id = individual_progress_milestones.plan_id
    AND (
      is_global_admin_secure() OR
      p.coach_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.user_players up
        WHERE up.player_id = p.player_id AND up.user_id = auth.uid()
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.individual_training_plans p
    WHERE p.id = individual_progress_milestones.plan_id
    AND (
      is_global_admin_secure() OR
      p.coach_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.user_players up
        WHERE up.player_id = p.player_id AND up.user_id = auth.uid()
      )
    )
  )
);

-- Add indexes for performance
CREATE INDEX idx_individual_plan_assignments_plan_id ON public.individual_plan_assignments(plan_id);
CREATE INDEX idx_individual_plan_assignments_assigned_by ON public.individual_plan_assignments(assigned_by);
CREATE INDEX idx_ai_training_recommendations_player_id ON public.ai_training_recommendations(player_id);
CREATE INDEX idx_ai_training_recommendations_expires_at ON public.ai_training_recommendations(expires_at);
CREATE INDEX idx_individual_progress_milestones_plan_id ON public.individual_progress_milestones(plan_id);

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_individual_plan_assignments_updated_at
  BEFORE UPDATE ON public.individual_plan_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_individual_progress_milestones_updated_at
  BEFORE UPDATE ON public.individual_progress_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();