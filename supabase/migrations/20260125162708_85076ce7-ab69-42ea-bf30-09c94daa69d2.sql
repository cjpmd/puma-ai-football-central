-- Add performance indexes for auth context queries
-- These indexes speed up foreign key lookups and prevent statement timeouts

-- user_players indexes
CREATE INDEX IF NOT EXISTS idx_user_players_user_id ON public.user_players(user_id);
CREATE INDEX IF NOT EXISTS idx_user_players_player_id ON public.user_players(player_id);

-- user_teams indexes
CREATE INDEX IF NOT EXISTS idx_user_teams_user_id ON public.user_teams(user_id);
CREATE INDEX IF NOT EXISTS idx_user_teams_team_id ON public.user_teams(team_id);

-- user_clubs indexes
CREATE INDEX IF NOT EXISTS idx_user_clubs_user_id ON public.user_clubs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_clubs_club_id ON public.user_clubs(club_id);

-- club_teams indexes
CREATE INDEX IF NOT EXISTS idx_club_teams_club_id ON public.club_teams(club_id);
CREATE INDEX IF NOT EXISTS idx_club_teams_team_id ON public.club_teams(team_id);

-- event_selections indexes for team selection lookups
CREATE INDEX IF NOT EXISTS idx_event_selections_event_id ON public.event_selections(event_id);
CREATE INDEX IF NOT EXISTS idx_event_selections_team_id ON public.event_selections(team_id);
CREATE INDEX IF NOT EXISTS idx_event_selections_event_team ON public.event_selections(event_id, team_id);

-- players team_id index for fast team player lookups
CREATE INDEX IF NOT EXISTS idx_players_team_id ON public.players(team_id);