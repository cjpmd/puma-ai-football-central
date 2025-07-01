
-- Add RLS policies for user_teams table to allow global admins to manage all user-team relationships

-- Allow global admins to view all user-team relationships
CREATE POLICY "Global admins can view all user teams"
ON public.user_teams
FOR SELECT
TO authenticated
USING (public.user_is_global_admin());

-- Allow global admins to create user-team relationships
CREATE POLICY "Global admins can create user teams"
ON public.user_teams
FOR INSERT
TO authenticated
WITH CHECK (public.user_is_global_admin());

-- Allow global admins to update user-team relationships
CREATE POLICY "Global admins can update user teams"
ON public.user_teams
FOR UPDATE
TO authenticated
USING (public.user_is_global_admin());

-- Allow global admins to delete user-team relationships
CREATE POLICY "Global admins can delete user teams"
ON public.user_teams
FOR DELETE
TO authenticated
USING (public.user_is_global_admin());
