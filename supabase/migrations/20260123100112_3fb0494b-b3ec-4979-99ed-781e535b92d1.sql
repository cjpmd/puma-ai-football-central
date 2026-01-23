-- Phase 1: Create Security Definer Helper Functions

-- Function to check if user is a global admin (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_global_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_uuid
    AND 'global_admin' = ANY(roles)
  )
$$;

-- Function to check if user is linked to a player (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_linked_to_player(user_uuid uuid, player_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_players
    WHERE user_id = user_uuid
    AND player_id = player_uuid
  )
$$;

-- Phase 2: Drop the Problematic Policies
DROP POLICY IF EXISTS "Global admins can manage all players" ON public.players;
DROP POLICY IF EXISTS "Linked users can update player card customization" ON public.players;

-- Phase 3: Recreate Policies Using Security Definer Functions

-- Global admins can manage all players (using function to avoid recursion)
CREATE POLICY "Global admins can manage all players"
ON public.players FOR ALL
TO authenticated
USING (public.is_global_admin(auth.uid()))
WITH CHECK (public.is_global_admin(auth.uid()));

-- Linked users can update their player's card (using function to avoid recursion)
CREATE POLICY "Linked users can update player card customization"
ON public.players FOR UPDATE
TO authenticated
USING (public.is_linked_to_player(auth.uid(), id))
WITH CHECK (public.is_linked_to_player(auth.uid(), id));