-- P2: Add missing performance indexes
-- idx_ai_training_player_id: speeds up per-player recommendation lookups
CREATE INDEX IF NOT EXISTS idx_ai_training_player_id
  ON public.ai_training_recommendations (player_id);

-- idx_drill_subgroup_players_composite: speeds up both player and subgroup lookups
CREATE INDEX IF NOT EXISTS idx_drill_subgroup_players_composite
  ON public.drill_subgroup_players (player_id, drill_subgroup_id);
