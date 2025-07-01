
-- First, drop the problematic policy
DROP POLICY "Global admins can view all profiles" ON public.profiles;

-- Create a security definer function to check if current user is global admin
CREATE OR REPLACE FUNCTION public.user_is_global_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND 'global_admin' = ANY(roles)
  );
$$;

-- Create the correct policy using the security definer function
CREATE POLICY "Global admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.user_is_global_admin());
