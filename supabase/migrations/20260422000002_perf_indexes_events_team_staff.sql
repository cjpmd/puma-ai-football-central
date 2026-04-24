-- Composite index covering the two most common filter columns on events.
-- Every dashboard/calendar query does:
--   .in('team_id', [...]).gte('date', ...) or .lt('date', ...)
-- Without this Postgres falls back to a seq-scan on the events table.
CREATE INDEX IF NOT EXISTS idx_events_team_id_date
  ON public.events (team_id, date DESC);

-- Partial index for the "recent results" query pattern:
--   .in('team_id',...).lt('date', today).not('scores','is',null)
-- Narrows the scan to only rows that have scores recorded.
CREATE INDEX IF NOT EXISTS idx_events_team_date_scored
  ON public.events (team_id, date DESC)
  WHERE scores IS NOT NULL;

-- team_staff: no index existed on user_id despite it being the primary lookup
-- column for role-checks: .eq('user_id', userId).limit(1)
CREATE INDEX IF NOT EXISTS idx_team_staff_user_id
  ON public.team_staff (user_id);

-- event_availability: composite for the staff availability query pattern
--   .eq('user_id', userId).in('event_id', [...]).eq('role', 'staff')
-- The existing unique index leads with event_id; this one leads with user_id+role
-- so the planner can seek directly to a user's staff rows without a seq-scan.
CREATE INDEX IF NOT EXISTS idx_event_availability_user_role
  ON public.event_availability (user_id, role);
