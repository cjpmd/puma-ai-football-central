
-- Check current policies on profiles table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- Drop the existing problematic policy if it exists
DROP POLICY IF EXISTS "Global admins can create profiles for any user" ON public.profiles;

-- Create a new policy that allows global admins to insert profiles for any user
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

-- Also ensure global admins can update profiles for any user
CREATE POLICY "Global admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND 'global_admin' = ANY(roles)
  )
);
