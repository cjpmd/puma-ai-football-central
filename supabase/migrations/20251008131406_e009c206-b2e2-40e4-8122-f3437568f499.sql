-- Create event_invitations table to track who is invited to each event
CREATE TABLE public.event_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_type TEXT NOT NULL CHECK (invitee_type IN ('player', 'staff', 'parent')),
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.team_staff(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id, invitee_type)
);

-- Enable RLS
ALTER TABLE public.event_invitations ENABLE ROW LEVEL SECURITY;

-- Team managers can create invitations for their events
CREATE POLICY "Team managers can create event invitations"
ON public.event_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.user_teams ut ON ut.team_id = e.team_id
    WHERE e.id = event_invitations.event_id
    AND ut.user_id = auth.uid()
    AND ut.role = ANY(ARRAY['team_manager', 'team_assistant_manager', 'team_coach'])
  )
);

-- Team managers can view invitations for their events
CREATE POLICY "Team managers can view event invitations"
ON public.event_invitations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.user_teams ut ON ut.team_id = e.team_id
    WHERE e.id = event_invitations.event_id
    AND ut.user_id = auth.uid()
    AND ut.role = ANY(ARRAY['team_manager', 'team_assistant_manager', 'team_coach'])
  )
);

-- Users can view their own invitations
CREATE POLICY "Users can view their own event invitations"
ON public.event_invitations
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Team managers can delete invitations for their events
CREATE POLICY "Team managers can delete event invitations"
ON public.event_invitations
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.user_teams ut ON ut.team_id = e.team_id
    WHERE e.id = event_invitations.event_id
    AND ut.user_id = auth.uid()
    AND ut.role = ANY(ARRAY['team_manager', 'team_assistant_manager', 'team_coach'])
  )
);

-- Create index for faster lookups
CREATE INDEX idx_event_invitations_event_id ON public.event_invitations(event_id);
CREATE INDEX idx_event_invitations_user_id ON public.event_invitations(user_id);