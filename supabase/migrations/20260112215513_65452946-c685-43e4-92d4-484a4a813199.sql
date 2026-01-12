-- Drop existing policies
DROP POLICY IF EXISTS "Team managers can manage privacy settings" ON team_privacy_settings;
DROP POLICY IF EXISTS "Users can view privacy settings for their teams" ON team_privacy_settings;
DROP POLICY IF EXISTS "Managers can create privacy settings" ON team_privacy_settings;
DROP POLICY IF EXISTS "Managers can update privacy settings" ON team_privacy_settings;
DROP POLICY IF EXISTS "Managers can delete privacy settings" ON team_privacy_settings;

-- Create helper function to check if user can manage team settings
CREATE OR REPLACE FUNCTION public.can_manage_team_settings(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is global_admin
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND 'global_admin' = ANY(roles)
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user has team management role
  IF EXISTS (
    SELECT 1 FROM user_teams ut
    WHERE ut.team_id = p_team_id
    AND ut.user_id = auth.uid()
    AND ut.role IN ('team_manager', 'team_assistant_manager', 'team_coach')
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is club_admin for the team's club
  IF EXISTS (
    SELECT 1 FROM club_teams ct
    JOIN club_officials co ON co.club_id = ct.club_id
    WHERE ct.team_id = p_team_id
    AND co.user_id = auth.uid()
    AND co.role IN ('admin', 'chair')
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Policy for SELECT - team members can view
CREATE POLICY "Users can view privacy settings for their teams"
ON team_privacy_settings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_teams ut
    WHERE ut.team_id = team_privacy_settings.team_id
    AND ut.user_id = auth.uid()
  )
  OR
  public.can_manage_team_settings(team_id)
);

-- Policy for INSERT - managers/admins can create
CREATE POLICY "Managers can create privacy settings"
ON team_privacy_settings FOR INSERT
TO authenticated
WITH CHECK (
  public.can_manage_team_settings(team_id)
);

-- Policy for UPDATE - managers/admins can update
CREATE POLICY "Managers can update privacy settings"
ON team_privacy_settings FOR UPDATE
TO authenticated
USING (public.can_manage_team_settings(team_id))
WITH CHECK (public.can_manage_team_settings(team_id));

-- Policy for DELETE - managers/admins can delete
CREATE POLICY "Managers can delete privacy settings"
ON team_privacy_settings FOR DELETE
TO authenticated
USING (public.can_manage_team_settings(team_id));