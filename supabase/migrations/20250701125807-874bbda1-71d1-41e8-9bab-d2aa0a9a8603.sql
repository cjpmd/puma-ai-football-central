
-- Add RLS policy to allow global admins to view all profiles
CREATE POLICY "Global admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND 'global_admin' = ANY(roles)
  )
);
