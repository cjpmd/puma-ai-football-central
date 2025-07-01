
-- Add RLS policies for user_players table to allow global admins to manage user-player relationships

-- Allow global admins to view all user-player relationships
CREATE POLICY "Global admins can view all user players"
ON public.user_players
FOR SELECT
TO authenticated
USING (public.user_is_global_admin());

-- Allow global admins to create user-player relationships
CREATE POLICY "Global admins can create user players"
ON public.user_players
FOR INSERT
TO authenticated
WITH CHECK (public.user_is_global_admin());

-- Allow global admins to update user-player relationships
CREATE POLICY "Global admins can update user players"
ON public.user_players
FOR UPDATE
TO authenticated
USING (public.user_is_global_admin());

-- Allow global admins to delete user-player relationships
CREATE POLICY "Global admins can delete user players"
ON public.user_players
FOR DELETE
TO authenticated
USING (public.user_is_global_admin());

-- Add similar policies for user_staff table
CREATE POLICY "Global admins can view all user staff"
ON public.user_staff
FOR SELECT
TO authenticated
USING (public.user_is_global_admin());

CREATE POLICY "Global admins can create user staff"
ON public.user_staff
FOR INSERT
TO authenticated
WITH CHECK (public.user_is_global_admin());

CREATE POLICY "Global admins can update user staff"
ON public.user_staff
FOR UPDATE
TO authenticated
USING (public.user_is_global_admin());

CREATE POLICY "Global admins can delete user staff"
ON public.user_staff
FOR DELETE
TO authenticated
USING (public.user_is_global_admin());
