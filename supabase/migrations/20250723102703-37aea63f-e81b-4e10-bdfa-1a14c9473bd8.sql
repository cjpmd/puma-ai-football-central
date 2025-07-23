
-- Phase 1: Database Cleanup and Schema Improvements

-- First, let's clean up any duplicate staff entries for Chris McDonald
DELETE FROM team_staff 
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY team_id, email ORDER BY created_at) as rn
    FROM team_staff 
    WHERE email = 'chrisjpmcdonald@gmail.com'
  ) t WHERE rn > 1
);

-- Clean up incorrect availability records (remove any "player" role records for staff members)
DELETE FROM event_availability 
WHERE role = 'player' 
AND user_id IN (
  SELECT DISTINCT us.user_id 
  FROM user_staff us 
  JOIN team_staff ts ON us.staff_id = ts.id
);

-- Clean up any "parent" role availability records - these should be "player" records instead
UPDATE event_availability 
SET role = 'player' 
WHERE role = 'parent';

-- Update the get_user_event_roles function to properly handle parent-to-player relationships
CREATE OR REPLACE FUNCTION public.get_user_event_roles(p_user_id uuid, p_event_id uuid)
RETURNS TABLE(role text, source_id uuid, source_type text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Return staff role if user is linked to staff selected for this event
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
  
  -- Return player role for players linked to this user (parent relationship)
  RETURN QUERY
  SELECT 
    'player'::TEXT as role,
    up.player_id as source_id,
    'player_link'::TEXT as source_type
  FROM user_players up
  JOIN events e ON e.id = p_event_id
  JOIN players p ON p.id = up.player_id AND p.team_id = e.team_id
  WHERE up.user_id = p_user_id;
  
  -- Return direct player role if user is directly linked as a player
  RETURN QUERY
  SELECT 
    'player'::TEXT as role,
    p_user_id as source_id,
    'direct'::TEXT as source_type
  FROM event_availability ea
  WHERE ea.user_id = p_user_id 
  AND ea.event_id = p_event_id
  AND ea.role = 'player';
END;
$function$

-- Create a function to migrate existing parent availability records to player records
CREATE OR REPLACE FUNCTION migrate_parent_to_player_availability()
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  -- This function has already been applied above with the UPDATE statement
  -- but we're keeping it for reference
  RAISE NOTICE 'Parent to player availability migration completed';
END;
$function$

-- Add an index to improve performance for availability queries
CREATE INDEX IF NOT EXISTS idx_event_availability_user_role 
ON event_availability(user_id, role, event_id);

-- Add an index for user_players relationships
CREATE INDEX IF NOT EXISTS idx_user_players_user_id 
ON user_players(user_id);

-- Add an index for user_staff relationships  
CREATE INDEX IF NOT EXISTS idx_user_staff_user_id 
ON user_staff(user_id);
