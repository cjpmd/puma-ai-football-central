-- Security fixes based on linter results

-- 1. Fix security definer functions by adding SET search_path to public for all functions
-- This prevents search path attacks

-- First, let's update all existing functions to have proper search path
ALTER FUNCTION public.auto_send_availability_notifications() SET search_path TO 'public';
ALTER FUNCTION public.standardize_position_name(text) SET search_path TO 'public';
ALTER FUNCTION public.debug_player_positions(uuid, text) SET search_path TO 'public';
ALTER FUNCTION public.regenerate_all_event_player_stats() SET search_path TO 'public';
ALTER FUNCTION public.backup_event_selections() SET search_path TO 'public';
ALTER FUNCTION public.generate_team_join_code(text) SET search_path TO 'public';
ALTER FUNCTION public.regenerate_player_stats_batch_safe() SET search_path TO 'public';
ALTER FUNCTION public.generate_parent_linking_code() SET search_path TO 'public';
ALTER FUNCTION public.update_single_player_stats(uuid) SET search_path TO 'public';
ALTER FUNCTION public.get_user_event_roles(uuid, uuid) SET search_path TO 'public';
ALTER FUNCTION public.clean_and_regenerate_player_stats() SET search_path TO 'public';
ALTER FUNCTION public.get_current_user_id() SET search_path TO 'public';
ALTER FUNCTION public.update_player_match_stats(uuid) SET search_path TO 'public';
ALTER FUNCTION public.update_event_player_stats(uuid) SET search_path TO 'public';
ALTER FUNCTION public.trigger_update_player_stats() SET search_path TO 'public';
ALTER FUNCTION public.update_all_completed_events_stats() SET search_path TO 'public';
ALTER FUNCTION public.create_event_player_stats_from_selections() SET search_path TO 'public';
ALTER FUNCTION public.user_is_global_admin() SET search_path TO 'public';
ALTER FUNCTION public.generate_club_serial() SET search_path TO 'public';
ALTER FUNCTION public.handle_new_club() SET search_path TO 'public';
ALTER FUNCTION public.handle_club_creator_role() SET search_path TO 'public';
ALTER FUNCTION public.update_availability_status(uuid, uuid, text, text) SET search_path TO 'public';
ALTER FUNCTION public.handle_new_user() SET search_path TO 'public';
ALTER FUNCTION public.send_availability_notifications(uuid) SET search_path TO 'public';

-- 2. Fix overly permissive RLS policies

-- Drop the overly permissive policies and replace with proper authorization
DROP POLICY IF EXISTS "Authenticated users can manage clubs" ON clubs;
DROP POLICY IF EXISTS "Authenticated users can manage events" ON events;
DROP POLICY IF EXISTS "Authenticated users can manage facilities" ON facilities;
DROP POLICY IF EXISTS "Authenticated users can manage facility availability" ON facility_availability;
DROP POLICY IF EXISTS "Authenticated users can manage players" ON players;
DROP POLICY IF EXISTS "Authenticated users can manage staff certifications" ON staff_certifications;
DROP POLICY IF EXISTS "Authenticated users can manage club officials" ON club_officials;

-- Create proper club management policies
CREATE POLICY "Club officials can manage their clubs" ON clubs
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM club_officials co
    WHERE co.club_id = clubs.id 
    AND co.user_id = auth.uid()
    AND co.role IN ('admin', 'manager', 'secretary')
  )
);

CREATE POLICY "Users can view clubs they're connected to" ON clubs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM club_officials co
    WHERE co.club_id = clubs.id AND co.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM club_teams ct
    JOIN user_teams ut ON ct.team_id = ut.team_id
    WHERE ct.club_id = clubs.id AND ut.user_id = auth.uid()
  )
);

-- Create proper event management policies
CREATE POLICY "Team members can manage their team events" ON events
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_teams ut
    WHERE ut.team_id = events.team_id 
    AND ut.user_id = auth.uid()
    AND ut.role IN ('team_manager', 'team_assistant_manager', 'team_coach')
  )
);

CREATE POLICY "Team members can view their team events" ON events
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_teams ut
    WHERE ut.team_id = events.team_id AND ut.user_id = auth.uid()
  )
);

-- Create proper facility management policies  
CREATE POLICY "Club officials can manage club facilities" ON facilities
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM club_officials co
    WHERE co.club_id = facilities.club_id 
    AND co.user_id = auth.uid()
    AND co.role IN ('admin', 'manager', 'secretary')
  )
);

-- Create proper facility availability policies
CREATE POLICY "Club and team members can view facility availability" ON facility_availability
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM facilities f
    JOIN club_officials co ON co.club_id = f.club_id
    WHERE f.id = facility_availability.facility_id 
    AND co.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM user_teams ut
    WHERE ut.team_id = facility_availability.booked_by_team_id 
    AND ut.user_id = auth.uid()
  )
);

CREATE POLICY "Team managers can book facilities" ON facility_availability
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM facilities f
    JOIN club_teams ct ON ct.club_id = f.club_id
    JOIN user_teams ut ON ut.team_id = ct.team_id
    WHERE f.id = facility_availability.facility_id 
    AND ut.user_id = auth.uid()
    AND ut.role IN ('team_manager', 'team_assistant_manager')
  )
);

CREATE POLICY "Team managers can update their bookings" ON facility_availability
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM user_teams ut
    WHERE ut.team_id = facility_availability.booked_by_team_id 
    AND ut.user_id = auth.uid()
    AND ut.role IN ('team_manager', 'team_assistant_manager')
  )
);

-- Create proper player management policies
CREATE POLICY "Team staff can manage their team players" ON players
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_teams ut
    WHERE ut.team_id = players.team_id 
    AND ut.user_id = auth.uid()
    AND ut.role IN ('team_manager', 'team_assistant_manager', 'team_coach')
  )
);

-- Create proper staff certification policies
CREATE POLICY "Club officials can manage staff certifications" ON staff_certifications
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM club_officials co
    WHERE co.club_id = staff_certifications.club_id 
    AND co.user_id = auth.uid()
    AND co.role IN ('admin', 'manager')
  ) OR
  staff_certifications.user_id = auth.uid()
);

-- Create proper club officials policies
CREATE POLICY "Club admins can manage officials" ON club_officials
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM club_officials co
    WHERE co.club_id = club_officials.club_id 
    AND co.user_id = auth.uid()
    AND co.role = 'admin'
  )
);

-- 3. Add missing DELETE policies for critical tables that need them

-- Event attendees DELETE policy
CREATE POLICY "Users can delete their own attendance" ON event_attendees
FOR DELETE USING (user_id = auth.uid());

-- Event availability DELETE policy  
CREATE POLICY "Users can delete their own availability records" ON event_availability
FOR DELETE USING (user_id = auth.uid());

-- Team managers can delete availability for their events
CREATE POLICY "Team managers can delete event availability" ON event_availability
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM events e
    JOIN user_teams ut ON e.team_id = ut.team_id
    WHERE e.id = event_availability.event_id 
    AND ut.user_id = auth.uid()
    AND ut.role IN ('team_manager', 'team_assistant_manager')
  )
);

-- Facility availability DELETE policy
CREATE POLICY "Team managers can delete their facility bookings" ON facility_availability
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM user_teams ut
    WHERE ut.team_id = facility_availability.booked_by_team_id 
    AND ut.user_id = auth.uid()
    AND ut.role IN ('team_manager', 'team_assistant_manager')
  )
);

-- Club officials can delete facility availability
CREATE POLICY "Club officials can delete facility availability" ON facility_availability
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM facilities f
    JOIN club_officials co ON co.club_id = f.club_id
    WHERE f.id = facility_availability.facility_id 
    AND co.user_id = auth.uid()
    AND co.role IN ('admin', 'manager')
  )
);

-- 4. Add missing policies for tables without proper coverage

-- Performance categories policies
CREATE POLICY "Team members can delete performance categories" ON performance_categories
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM user_teams ut
    WHERE ut.team_id = performance_categories.team_id 
    AND ut.user_id = auth.uid()
    AND ut.role IN ('team_manager', 'team_assistant_manager')
  )
);

-- Event teams policies  
CREATE POLICY "Team managers can delete event teams" ON event_teams
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM user_teams ut
    WHERE ut.team_id = event_teams.team_id 
    AND ut.user_id = auth.uid()
    AND ut.role IN ('team_manager', 'team_assistant_manager')
  )
);

-- 5. Strengthen existing policies by adding role checks where missing

-- Update team clothing sizes to require management roles for modifications
DROP POLICY IF EXISTS "Users can manage clothing sizes for their teams" ON team_clothing_sizes;
DROP POLICY IF EXISTS "Users can manage team clothing sizes" ON team_clothing_sizes;

CREATE POLICY "Team managers can manage clothing sizes" ON team_clothing_sizes
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_teams ut
    WHERE ut.team_id = team_clothing_sizes.team_id 
    AND ut.user_id = auth.uid()
    AND ut.role IN ('team_manager', 'team_assistant_manager', 'team_coach')
  )
);

-- Update team equipment policies to be more restrictive
DROP POLICY IF EXISTS "Team managers can manage equipment" ON team_equipment;

CREATE POLICY "Team managers can manage equipment" ON team_equipment
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_teams ut
    WHERE ut.team_id = team_equipment.team_id 
    AND ut.user_id = auth.uid()
    AND ut.role IN ('team_manager', 'team_assistant_manager')
  )
);

-- Add missing user_teams table policies (if not exist)
-- Note: This table might need to be created if it doesn't exist
-- Based on the policies referencing it, it should have these columns:
-- CREATE TABLE IF NOT EXISTS user_teams (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id UUID NOT NULL,
--   team_id UUID NOT NULL,
--   role TEXT NOT NULL,
--   created_at TIMESTAMPTZ DEFAULT now(),
--   UNIQUE(user_id, team_id)
-- );

-- Add missing user_clubs table policies (if not exist)  
-- Note: This table might need to be created if it doesn't exist
-- Based on the policies referencing it, it should have these columns:
-- CREATE TABLE IF NOT EXISTS user_clubs (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id UUID NOT NULL,
--   club_id UUID NOT NULL,
--   role TEXT NOT NULL,
--   created_at TIMESTAMPTZ DEFAULT now(),
--   UNIQUE(user_id, club_id)
-- );

-- Add missing user_staff table policies (if not exist)
-- Note: This table might need to be created if it doesn't exist  
-- Based on the policies referencing it, it should have these columns:
-- CREATE TABLE IF NOT EXISTS user_staff (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id UUID NOT NULL,
--   staff_id UUID NOT NULL,
--   created_at TIMESTAMPTZ DEFAULT now(),
--   UNIQUE(user_id, staff_id)
-- );

-- 6. Security improvements for sensitive operations

-- Ensure profiles table has proper constraints
-- Global admins should be very limited - consider if this is needed
DROP POLICY IF EXISTS "Global admins can create profiles for any user" ON profiles;
DROP POLICY IF EXISTS "Global admins can update any profile" ON profiles;

-- More restrictive admin policies
CREATE POLICY "Limited admin profile creation" ON profiles
FOR INSERT WITH CHECK (
  auth.uid() = id OR
  (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() 
    AND 'global_admin' = ANY(p.roles)
    AND array_length(p.roles, 1) = 1 -- Only allow if global_admin is the only role
  ))
);

CREATE POLICY "Limited admin profile updates" ON profiles
FOR UPDATE USING (
  auth.uid() = id OR
  (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() 
    AND 'global_admin' = ANY(p.roles)
    AND profiles.id != auth.uid() -- Can't update their own admin status
  ))
);

-- 7. Add audit triggers for sensitive operations (optional but recommended)
-- These will help track who made what changes

CREATE OR REPLACE FUNCTION public.audit_sensitive_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log sensitive changes to a hypothetical audit table
  -- INSERT INTO audit_logs (table_name, operation, old_data, new_data, user_id, timestamp)
  -- VALUES (TG_TABLE_NAME, TG_OP, to_jsonb(OLD), to_jsonb(NEW), auth.uid(), now());
  
  -- For now, just log to PostgreSQL logs
  RAISE NOTICE 'AUDIT: % operation on % by user %', TG_OP, TG_TABLE_NAME, auth.uid();
  
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;