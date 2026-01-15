-- Drop existing RLS policies on staff_requests
DROP POLICY IF EXISTS "Team managers can view team requests" ON staff_requests;
DROP POLICY IF EXISTS "Team managers can update team requests" ON staff_requests;
DROP POLICY IF EXISTS "Team managers can delete team requests" ON staff_requests;

-- Create updated SELECT policy with all management roles
CREATE POLICY "Team managers can view team requests" 
ON staff_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_teams ut
    WHERE ut.team_id = staff_requests.team_id
    AND ut.user_id = auth.uid()
    AND ut.role IN ('team_manager', 'team_assistant_manager', 'team_coach', 'admin', 'coach')
  )
  OR staff_requests.user_id = auth.uid()
);

-- Create updated UPDATE policy with all management roles
CREATE POLICY "Team managers can update team requests"
ON staff_requests FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_teams ut
    WHERE ut.team_id = staff_requests.team_id
    AND ut.user_id = auth.uid()
    AND ut.role IN ('team_manager', 'team_assistant_manager', 'team_coach', 'admin', 'coach')
  )
);

-- Create updated DELETE policy with all management roles
CREATE POLICY "Team managers can delete team requests"
ON staff_requests FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_teams ut
    WHERE ut.team_id = staff_requests.team_id
    AND ut.user_id = auth.uid()
    AND ut.role IN ('team_manager', 'team_assistant_manager', 'team_coach', 'admin', 'coach')
  )
);