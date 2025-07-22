
-- Enhance user_staff table to link staff members to user accounts
CREATE TABLE IF NOT EXISTS user_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  staff_id UUID REFERENCES team_staff(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, staff_id)
);

-- Enable RLS on user_staff
ALTER TABLE user_staff ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_staff
CREATE POLICY "Users can view their own staff links"
  ON user_staff FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own staff links"
  ON user_staff FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Team managers can create staff links"
  ON user_staff FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_staff ts
      JOIN user_teams ut ON ts.team_id = ut.team_id
      WHERE ts.id = staff_id 
      AND ut.user_id = auth.uid() 
      AND ut.role = ANY(ARRAY['team_manager', 'team_assistant_manager', 'team_coach'])
    )
  );

-- Create function to get user's multiple roles for an event
CREATE OR REPLACE FUNCTION get_user_event_roles(p_user_id UUID, p_event_id UUID)
RETURNS TABLE(role TEXT, source_id UUID, source_type TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return direct user availability
  RETURN QUERY
  SELECT 
    ea.role::TEXT,
    p_user_id as source_id,
    'direct'::TEXT as source_type
  FROM event_availability ea
  WHERE ea.user_id = p_user_id 
  AND ea.event_id = p_event_id;
  
  -- Return parent role (if user is linked to players in this event)
  RETURN QUERY
  SELECT 
    'parent'::TEXT as role,
    up.player_id as source_id,
    'player_link'::TEXT as source_type
  FROM user_players up
  JOIN events e ON e.id = p_event_id
  JOIN players p ON p.id = up.player_id AND p.team_id = e.team_id
  WHERE up.user_id = p_user_id;
  
  -- Return staff role (if user is linked to staff selected for this event)
  RETURN QUERY
  SELECT 
    'staff'::TEXT as role,
    us.staff_id as source_id,
    'staff_link'::TEXT as source_type
  FROM user_staff us
  JOIN event_selections es ON es.event_id = p_event_id
  WHERE us.user_id = p_user_id
  AND us.staff_id::TEXT = ANY(
    SELECT jsonb_array_elements_text(
      jsonb_path_query_array(es.staff_selection, '$[*].staffId')
    )
  );
END;
$$;
