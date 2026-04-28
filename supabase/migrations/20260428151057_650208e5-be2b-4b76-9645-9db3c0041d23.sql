-- 1. Cleanup duplicate team_staff rows: same team_id + same lower(email)
WITH ranked AS (
  SELECT
    id,
    team_id,
    lower(email) AS email_l,
    user_id,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY team_id, lower(email)
      ORDER BY (user_id IS NULL), created_at ASC
    ) AS rn
  FROM public.team_staff
  WHERE email IS NOT NULL AND trim(email) <> ''
)
DELETE FROM public.team_staff ts
USING ranked r
WHERE ts.id = r.id AND r.rn > 1;

-- 2. Prevent recurrence with a partial unique index (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS team_staff_team_email_unique
  ON public.team_staff (team_id, lower(email))
  WHERE email IS NOT NULL;

-- 3. SECURITY DEFINER RPC for join-code lookup (bypasses team SELECT RLS)
CREATE OR REPLACE FUNCTION public.get_team_by_join_code(_code text)
RETURNS TABLE (
  id uuid,
  name text,
  team_join_code text,
  team_join_code_expires_at timestamptz,
  logo_url text,
  club_id uuid,
  club_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.name,
    t.team_join_code,
    t.team_join_code_expires_at,
    t.logo_url,
    t.club_id,
    c.name AS club_name
  FROM public.teams t
  LEFT JOIN public.clubs c ON c.id = t.club_id
  WHERE t.team_join_code = upper(trim(_code))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_by_join_code(text) TO authenticated, anon;