
-- Add RLS policy to allow users to create their own availability records
CREATE POLICY "Users can create their own availability records" 
ON public.event_availability 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);
