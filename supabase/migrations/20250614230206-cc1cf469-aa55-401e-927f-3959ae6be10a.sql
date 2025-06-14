
-- First, let's check what RLS policies exist on the profiles table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- If no policies allow admins to insert profiles for other users, we'll need to add one
-- This policy allows users with 'global_admin' role to insert profiles for any user
CREATE POLICY "Global admins can create profiles for any user"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND 'global_admin' = ANY(roles)
  )
);
