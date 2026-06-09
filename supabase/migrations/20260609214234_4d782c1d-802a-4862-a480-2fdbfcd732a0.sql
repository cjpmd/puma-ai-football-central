
-- 1. ACADEMIES
DROP POLICY IF EXISTS "Academies viewable by authenticated users" ON public.academies;
CREATE POLICY "Academy members or club members can view academies"
ON public.academies FOR SELECT TO authenticated
USING (
  user_is_global_admin()
  OR is_academy_member(id, ARRAY['academy_admin'::text, 'head_of_academy'::text, 'academy_staff'::text])
  OR EXISTS (
    SELECT 1 FROM user_clubs uc
    WHERE uc.club_id = academies.club_id AND uc.user_id = auth.uid()
  )
);

-- 2. DRILL TAGS
DROP POLICY IF EXISTS "Team staff can create drill tags" ON public.drill_tags;
CREATE POLICY "Authenticated users can create drill tags"
ON public.drill_tags FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 3. PARENTS
DROP POLICY IF EXISTS "Users can view parents of their team players" ON public.parents;
CREATE POLICY "Team staff can view parents of their team players"
ON public.parents FOR SELECT TO authenticated
USING (
  user_is_global_admin()
  OR EXISTS (
    SELECT 1 FROM players p
    JOIN user_teams ut ON p.team_id = ut.team_id
    WHERE p.id = parents.player_id
      AND ut.user_id = auth.uid()
      AND ut.role = ANY (ARRAY['team_manager','team_assistant_manager','team_coach'])
  )
);

-- 4. SECURE NOTIFICATION TOKENS
DROP POLICY IF EXISTS "System can manage notification tokens" ON public.secure_notification_tokens;

-- 5. TEAM CLOTHING SIZES
DROP POLICY IF EXISTS "Users can view team clothing sizes" ON public.team_clothing_sizes;

-- 6. TEAM KIT ISSUES
DROP POLICY IF EXISTS "Users can manage team kit issues" ON public.team_kit_issues;
DROP POLICY IF EXISTS "Users can view team kit issues" ON public.team_kit_issues;

-- 7. TEAM KIT ITEMS
DROP POLICY IF EXISTS "Users can manage team kit items" ON public.team_kit_items;
DROP POLICY IF EXISTS "Users can view team kit items" ON public.team_kit_items;

-- 8. TEAM SUBSCRIPTIONS
DROP POLICY IF EXISTS "Authenticated users can manage team subscriptions" ON public.team_subscriptions;
CREATE POLICY "Team management can view team subscriptions"
ON public.team_subscriptions FOR SELECT TO authenticated
USING (
  user_is_global_admin()
  OR EXISTS (
    SELECT 1 FROM user_teams ut
    WHERE ut.team_id = team_subscriptions.team_id
      AND ut.user_id = auth.uid()
      AND ut.role = ANY (ARRAY['team_manager','team_assistant_manager'])
  )
  OR EXISTS (
    SELECT 1 FROM club_teams ct
    JOIN user_clubs uc ON uc.club_id = ct.club_id
    WHERE ct.team_id = team_subscriptions.team_id
      AND uc.user_id = auth.uid()
      AND uc.role = ANY (ARRAY['club_admin','club_chair'])
  )
);
CREATE POLICY "Team management can modify team subscriptions"
ON public.team_subscriptions FOR ALL TO authenticated
USING (
  user_is_global_admin()
  OR EXISTS (
    SELECT 1 FROM user_teams ut
    WHERE ut.team_id = team_subscriptions.team_id
      AND ut.user_id = auth.uid()
      AND ut.role = 'team_manager'
  )
  OR EXISTS (
    SELECT 1 FROM club_teams ct
    JOIN user_clubs uc ON uc.club_id = ct.club_id
    WHERE ct.team_id = team_subscriptions.team_id
      AND uc.user_id = auth.uid()
      AND uc.role = ANY (ARRAY['club_admin','club_chair'])
  )
)
WITH CHECK (
  user_is_global_admin()
  OR EXISTS (
    SELECT 1 FROM user_teams ut
    WHERE ut.team_id = team_subscriptions.team_id
      AND ut.user_id = auth.uid()
      AND ut.role = 'team_manager'
  )
  OR EXISTS (
    SELECT 1 FROM club_teams ct
    JOIN user_clubs uc ON uc.club_id = ct.club_id
    WHERE ct.team_id = team_subscriptions.team_id
      AND uc.user_id = auth.uid()
      AND uc.role = ANY (ARRAY['club_admin','club_chair'])
  )
);

-- 9. USER INVITATIONS
DROP POLICY IF EXISTS "Allow public read access to pending invitations" ON public.user_invitations;
CREATE POLICY "Invitee or inviter can read invitations"
ON public.user_invitations FOR SELECT TO authenticated
USING (
  invited_by = auth.uid()
  OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

-- 10. USER_TEAMS
DROP POLICY IF EXISTS "Users can manage own team memberships" ON public.user_teams;
CREATE POLICY "Users can self-join as basic player"
ON public.user_teams FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND role = 'team_player');
CREATE POLICY "Users can leave their team memberships"
ON public.user_teams FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- 11. STORAGE: logos
DROP POLICY IF EXISTS "Users can delete logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own logos" ON storage.objects;
CREATE POLICY "Owners can update their logos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'logos' AND owner = auth.uid())
WITH CHECK (bucket_id = 'logos' AND owner = auth.uid());
CREATE POLICY "Owners can delete their logos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'logos' AND owner = auth.uid());

-- 12. STORAGE: player_photos
DROP POLICY IF EXISTS "Allow authenticated upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload player photos as owner"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'player_photos' AND owner = auth.uid());

-- 13. STORAGE: drill-media SELECT (fix broken JOIN)
DROP POLICY IF EXISTS "Users can view drill media they have access to" ON storage.objects;
CREATE POLICY "Users can view drill media they have access to"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'drill-media' AND (
    EXISTS (
      SELECT 1 FROM drills d
      WHERE (d.id)::text = (storage.foldername(name))[1] AND d.is_public = true
    )
    OR EXISTS (
      SELECT 1 FROM drills d
      WHERE (d.id)::text = (storage.foldername(name))[1] AND d.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM drills d
      JOIN user_teams ut ON ut.team_id = d.team_id
      WHERE (d.id)::text = (storage.foldername(name))[1]
        AND ut.user_id = auth.uid()
    )
  )
);
