-- Fix club visibility by adding missing user_clubs record for Dundee East Girls
-- and updating trigger to insert into both tables for future club creations

-- Step 1: Add missing user_clubs record for the newly created club
INSERT INTO public.user_clubs (user_id, club_id, role)
VALUES (
  'bdc91e32-bf4c-4e86-bd99-252ba43e3cc2',
  'd66e1bc4-b8e0-42f6-baf2-7b83b7f93031',
  'club_admin'
)
ON CONFLICT DO NOTHING;

-- Step 2: Update trigger function to insert into both club_officials AND user_clubs
CREATE OR REPLACE FUNCTION public.handle_club_creator_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert the club creator as admin in club_officials
  INSERT INTO public.club_officials (club_id, user_id, role, assigned_by)
  VALUES (NEW.id, auth.uid(), 'admin', auth.uid());
  
  -- Also insert into user_clubs so the club appears in the user's club list
  INSERT INTO public.user_clubs (user_id, club_id, role)
  VALUES (auth.uid(), NEW.id, 'club_admin');
  
  RETURN NEW;
END;
$$;