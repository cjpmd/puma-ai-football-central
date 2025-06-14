
-- This enables Row Level Security on the user_invitations table to control data access.
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- This policy allows anyone (including non-logged-in users) to view details
-- of PENDING invitations. This is crucial for the invitation link to work.
CREATE POLICY "Allow public read access to pending invitations"
ON public.user_invitations
FOR SELECT
USING (status = 'pending');

-- This policy allows any logged-in user to create new invitations.
CREATE POLICY "Allow authenticated users to create invitations"
ON public.user_invitations
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- This policy allows any logged-in user to update an invitation,
-- which is required for accepting an invitation after signing up.
CREATE POLICY "Allow authenticated users to update invitations"
ON public.user_invitations
FOR UPDATE
USING (auth.role() = 'authenticated');
