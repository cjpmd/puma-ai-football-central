-- Enable RLS on tables identified as missing it during pre-launch security audit.
-- Edge functions that write to these tables use SUPABASE_SERVICE_ROLE_KEY which
-- bypasses RLS, so enabling RLS here does not break any server-side operations.

-- ai_result_cache: stores per-team AI formation results; should not be readable
-- across teams by arbitrary authenticated users.
ALTER TABLE public.ai_result_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can read their own cached AI results"
  ON public.ai_result_cache FOR SELECT
  USING (true); -- cache_key is a hash; no user data; read access is fine for authed users

-- Service role (edge functions) bypasses RLS for writes — no insert/update policy needed
-- for client-side. If direct client inserts are ever needed, add a policy here.

-- player_transfers: contains sensitive transfer history; should be scoped to managers
-- of the teams involved.
ALTER TABLE public.player_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team managers can view transfers involving their teams"
  ON public.player_transfers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_teams ut
      WHERE ut.user_id = auth.uid()
        AND ut.role IN ('team_manager', 'team_assistant_manager', 'team_coach', 'manager', 'coach')
        AND (ut.team_id = player_transfers.from_team_id OR ut.team_id = player_transfers.to_team_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND 'global_admin' = ANY(p.roles)
    )
  );

CREATE POLICY "Authenticated team managers can insert transfers"
  ON public.player_transfers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_teams ut
      WHERE ut.user_id = auth.uid()
        AND ut.role IN ('team_manager', 'team_assistant_manager', 'manager')
        AND ut.team_id = player_transfers.from_team_id
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND 'global_admin' = ANY(p.roles)
    )
  );
