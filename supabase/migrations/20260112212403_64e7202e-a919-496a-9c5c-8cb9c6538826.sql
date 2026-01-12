-- Create RPC functions for verifying player/parent linking codes (accessible to anonymous users)
CREATE OR REPLACE FUNCTION verify_player_linking_code(code TEXT)
RETURNS TABLE(
  player_id UUID,
  player_name TEXT,
  team_id UUID,
  team_name TEXT,
  squad_number INTEGER,
  photo_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.team_id, t.name, p.squad_number, p.photo_url
  FROM players p
  JOIN teams t ON t.id = p.team_id
  WHERE p.linking_code = code
  AND p.status = 'active';
END;
$$;

CREATE OR REPLACE FUNCTION verify_parent_linking_code(code TEXT)
RETURNS TABLE(
  player_id UUID,
  player_name TEXT,
  team_id UUID,
  team_name TEXT,
  squad_number INTEGER,
  photo_url TEXT,
  is_expired BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id, 
    p.name, 
    p.team_id, 
    t.name, 
    p.squad_number, 
    p.photo_url,
    (p.parent_linking_code_expires_at IS NOT NULL AND p.parent_linking_code_expires_at < NOW())
  FROM players p
  JOIN teams t ON t.id = p.team_id
  WHERE p.parent_linking_code = code
  AND p.status = 'active';
END;
$$;

-- Grant execute permissions to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION verify_player_linking_code(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION verify_player_linking_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_parent_linking_code(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION verify_parent_linking_code(TEXT) TO authenticated;

-- Create staff_requests table for pending staff signups
CREATE TABLE public.staff_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Enable RLS
ALTER TABLE public.staff_requests ENABLE ROW LEVEL SECURITY;

-- Users can create their own requests
CREATE POLICY "Users can create their own requests"
ON public.staff_requests FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can view their own requests
CREATE POLICY "Users can view their own requests"
ON public.staff_requests FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Team managers can view requests for their teams
CREATE POLICY "Team managers can view team requests"
ON public.staff_requests FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_teams ut
    WHERE ut.team_id = staff_requests.team_id
    AND ut.user_id = auth.uid()
    AND ut.role IN ('team_manager', 'team_assistant_manager')
  )
);

-- Team managers can update requests for their teams
CREATE POLICY "Team managers can update team requests"
ON public.staff_requests FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_teams ut
    WHERE ut.team_id = staff_requests.team_id
    AND ut.user_id = auth.uid()
    AND ut.role IN ('team_manager', 'team_assistant_manager')
  )
);

-- Team managers can delete requests for their teams
CREATE POLICY "Team managers can delete team requests"
ON public.staff_requests FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_teams ut
    WHERE ut.team_id = staff_requests.team_id
    AND ut.user_id = auth.uid()
    AND ut.role IN ('team_manager', 'team_assistant_manager')
  )
);

-- Create indexes for performance
CREATE INDEX idx_staff_requests_team_id ON public.staff_requests(team_id);
CREATE INDEX idx_staff_requests_user_id ON public.staff_requests(user_id);
CREATE INDEX idx_staff_requests_status ON public.staff_requests(status);