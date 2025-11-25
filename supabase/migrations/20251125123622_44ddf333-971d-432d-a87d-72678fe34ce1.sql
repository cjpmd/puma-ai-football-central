-- Fix club creation RLS issue by adding SECURITY DEFINER to handle_club_creator_role
-- This allows the trigger function to bypass RLS when inserting the club creator as admin

CREATE OR REPLACE FUNCTION public.handle_club_creator_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- Run with function owner's privileges, bypassing RLS
SET search_path = public
AS $$
BEGIN
  -- Insert the club creator as admin
  INSERT INTO public.club_officials (club_id, user_id, role, assigned_by)
  VALUES (NEW.id, auth.uid(), 'admin', auth.uid());
  
  RETURN NEW;
END;
$$;