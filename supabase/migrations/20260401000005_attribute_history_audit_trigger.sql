-- ============================================================
-- Attribute history audit trigger
-- Automatically records a row in player_attribute_history
-- whenever the `attributes` JSONB column changes on a player.
-- This gives ML models a time-series view of player development.
-- ============================================================

-- Ensure the history table exists (may already exist from earlier migration)
CREATE TABLE IF NOT EXISTS player_attribute_history (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id       UUID        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  attribute_name  TEXT        NOT NULL,
  attribute_group TEXT,
  old_value       NUMERIC,
  new_value       NUMERIC,
  recorded_date   DATE        NOT NULL DEFAULT CURRENT_DATE,
  recorded_by     UUID        REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pah_player_name_date
  ON player_attribute_history(player_id, attribute_name, recorded_date DESC);

ALTER TABLE player_attribute_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can read attribute history"
  ON player_attribute_history
  FOR SELECT
  USING (
    player_id IN (
      SELECT p.id FROM players p
      JOIN user_teams ut ON ut.team_id = p.team_id
      WHERE ut.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------
-- Trigger function: diff old vs new attributes JSONB and
-- write one row per changed attribute.
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_audit_player_attributes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_attr  JSONB;
  v_new_attr  JSONB;
  v_attr_item JSONB;
  v_attr_name TEXT;
  v_old_val   NUMERIC;
  v_new_val   NUMERIC;
  v_group     TEXT;
BEGIN
  -- Only run if attributes actually changed
  IF OLD.attributes IS NOT DISTINCT FROM NEW.attributes THEN
    RETURN NEW;
  END IF;

  v_old_attr := COALESCE(OLD.attributes, '[]'::JSONB);
  v_new_attr := COALESCE(NEW.attributes, '[]'::JSONB);

  -- Iterate over attributes in the new array
  FOR v_attr_item IN SELECT * FROM jsonb_array_elements(v_new_attr)
  LOOP
    v_attr_name := v_attr_item->>'name';
    v_new_val   := (v_attr_item->>'value')::NUMERIC;
    v_group     := v_attr_item->>'group';

    -- Find matching attribute in old array
    SELECT (elem->>'value')::NUMERIC
    INTO   v_old_val
    FROM   jsonb_array_elements(v_old_attr) elem
    WHERE  elem->>'name' = v_attr_name
    LIMIT  1;

    -- Only record if value actually changed
    IF v_old_val IS DISTINCT FROM v_new_val THEN
      INSERT INTO player_attribute_history
        (player_id, attribute_name, attribute_group, old_value, new_value, recorded_by)
      VALUES
        (NEW.id, v_attr_name, v_group, v_old_val, v_new_val, auth.uid());
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Attach trigger (drop first to allow idempotent re-runs)
DROP TRIGGER IF EXISTS trg_audit_player_attributes ON players;
CREATE TRIGGER trg_audit_player_attributes
  AFTER UPDATE OF attributes ON players
  FOR EACH ROW
  EXECUTE FUNCTION trg_audit_player_attributes();
