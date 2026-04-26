-- P5: Add updated_at column and auto-update trigger to 11 auxiliary tables
-- The update_updated_at_column() function already exists (created in 20250821184552)

-- ai_training_recommendations
ALTER TABLE public.ai_training_recommendations
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DROP TRIGGER IF EXISTS update_ai_training_recommendations_updated_at ON public.ai_training_recommendations;
CREATE TRIGGER update_ai_training_recommendations_updated_at
  BEFORE UPDATE ON public.ai_training_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- club_join_codes
ALTER TABLE public.club_join_codes
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DROP TRIGGER IF EXISTS update_club_join_codes_updated_at ON public.club_join_codes;
CREATE TRIGGER update_club_join_codes_updated_at
  BEFORE UPDATE ON public.club_join_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- coaching_badges
ALTER TABLE public.coaching_badges
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DROP TRIGGER IF EXISTS update_coaching_badges_updated_at ON public.coaching_badges;
CREATE TRIGGER update_coaching_badges_updated_at
  BEFORE UPDATE ON public.coaching_badges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- drill_media
ALTER TABLE public.drill_media
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DROP TRIGGER IF EXISTS update_drill_media_updated_at ON public.drill_media;
CREATE TRIGGER update_drill_media_updated_at
  BEFORE UPDATE ON public.drill_media
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- drill_subgroup_players
ALTER TABLE public.drill_subgroup_players
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DROP TRIGGER IF EXISTS update_drill_subgroup_players_updated_at ON public.drill_subgroup_players;
CREATE TRIGGER update_drill_subgroup_players_updated_at
  BEFORE UPDATE ON public.drill_subgroup_players
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- drill_subgroups
ALTER TABLE public.drill_subgroups
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DROP TRIGGER IF EXISTS update_drill_subgroups_updated_at ON public.drill_subgroups;
CREATE TRIGGER update_drill_subgroups_updated_at
  BEFORE UPDATE ON public.drill_subgroups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- drill_tag_assignments
ALTER TABLE public.drill_tag_assignments
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DROP TRIGGER IF EXISTS update_drill_tag_assignments_updated_at ON public.drill_tag_assignments;
CREATE TRIGGER update_drill_tag_assignments_updated_at
  BEFORE UPDATE ON public.drill_tag_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- drill_tags
ALTER TABLE public.drill_tags
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DROP TRIGGER IF EXISTS update_drill_tags_updated_at ON public.drill_tags;
CREATE TRIGGER update_drill_tags_updated_at
  BEFORE UPDATE ON public.drill_tags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- event_invitations
ALTER TABLE public.event_invitations
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DROP TRIGGER IF EXISTS update_event_invitations_updated_at ON public.event_invitations;
CREATE TRIGGER update_event_invitations_updated_at
  BEFORE UPDATE ON public.event_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- match_events
ALTER TABLE public.match_events
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DROP TRIGGER IF EXISTS update_match_events_updated_at ON public.match_events;
CREATE TRIGGER update_match_events_updated_at
  BEFORE UPDATE ON public.match_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- parents
ALTER TABLE public.parents
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DROP TRIGGER IF EXISTS update_parents_updated_at ON public.parents;
CREATE TRIGGER update_parents_updated_at
  BEFORE UPDATE ON public.parents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
