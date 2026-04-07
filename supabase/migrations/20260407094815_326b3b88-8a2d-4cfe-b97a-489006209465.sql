CREATE OR REPLACE VIEW public.team_staff_roles AS
SELECT t.id AS team_id,
    t.name AS team_name,
    p.id AS user_id,
    p.name AS staff_name,
    p.email AS staff_email,
    ut.role,
    ut.created_at
FROM user_teams ut
JOIN profiles p ON p.id = ut.user_id
JOIN teams t ON t.id = ut.team_id
WHERE ut.role = ANY (ARRAY[
  'manager'::text, 'team_manager'::text, 'team_assistant_manager'::text,
  'team_coach'::text, 'team_helper'::text, 'staff'::text
])
ORDER BY t.name, p.name;