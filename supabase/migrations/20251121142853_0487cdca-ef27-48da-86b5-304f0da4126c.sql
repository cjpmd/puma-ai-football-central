-- Create match_events table for logging in-game events
CREATE TABLE IF NOT EXISTS match_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('goal', 'assist', 'save', 'yellow_card', 'red_card')),
  minute integer,
  period_number integer,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_match_events_event ON match_events(event_id);
CREATE INDEX IF NOT EXISTS idx_match_events_player ON match_events(player_id);
CREATE INDEX IF NOT EXISTS idx_match_events_team ON match_events(team_id);

-- Enable Row Level Security
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for match_events
CREATE POLICY "Users can view match events for their teams"
  ON match_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = match_events.event_id
      AND EXISTS (
        SELECT 1 FROM team_staff ts
        WHERE ts.team_id = e.team_id
        AND ts.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Team staff can insert match events"
  ON match_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = match_events.event_id
      AND EXISTS (
        SELECT 1 FROM team_staff ts
        WHERE ts.team_id = e.team_id
        AND ts.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Team staff can update match events"
  ON match_events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = match_events.event_id
      AND EXISTS (
        SELECT 1 FROM team_staff ts
        WHERE ts.team_id = e.team_id
        AND ts.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Team staff can delete match events"
  ON match_events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = match_events.event_id
      AND EXISTS (
        SELECT 1 FROM team_staff ts
        WHERE ts.team_id = e.team_id
        AND ts.user_id = auth.uid()
      )
    )
  );