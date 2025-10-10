-- Allow invitations to exist for players/staff without linked user accounts
ALTER TABLE public.event_invitations
ALTER COLUMN user_id DROP NOT NULL;