-- Add global admin policy for players
CREATE POLICY "Global admins can manage all players"
ON public.players FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND 'global_admin' = ANY(profiles.roles)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND 'global_admin' = ANY(profiles.roles)
  )
);

-- Add policy for linked users to update their player's card
CREATE POLICY "Linked users can update player card customization"
ON public.players FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_players
    WHERE user_players.player_id = players.id
    AND user_players.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_players
    WHERE user_players.player_id = players.id
    AND user_players.user_id = auth.uid()
  )
);