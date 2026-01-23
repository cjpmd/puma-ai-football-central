-- Fix PUBLIC_DATA_EXPOSURE: Teams table RLS policy too permissive
-- Drop the overly permissive policy that allows anyone to view all teams
DROP POLICY IF EXISTS "Users can view teams" ON public.teams;

-- Create a new policy that requires authentication
CREATE POLICY "Authenticated users can view teams"
ON public.teams FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);