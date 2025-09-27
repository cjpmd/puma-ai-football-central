-- Create year_groups table to organize teams by age cohort
CREATE TABLE public.year_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g. "2015s", "Under 10s"
  age_year INTEGER, -- birth year for players (e.g. 2015)
  playing_format TEXT, -- e.g. "7-a-side", "9-a-side", "11-a-side"
  soft_player_limit INTEGER, -- optional guidance, not enforced
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(club_id, name)
);

-- Enable RLS for year_groups
ALTER TABLE public.year_groups ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for year_groups
CREATE POLICY "Club members can view year groups" 
ON public.year_groups 
FOR SELECT 
USING (is_club_member_secure(club_id));

CREATE POLICY "Club admins can manage year groups" 
ON public.year_groups 
FOR ALL 
USING (is_user_club_admin_secure(club_id, auth.uid()))
WITH CHECK (is_user_club_admin_secure(club_id, auth.uid()));

-- Add year_group_id to teams table
ALTER TABLE public.teams ADD COLUMN year_group_id UUID REFERENCES public.year_groups(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX idx_teams_year_group_id ON public.teams(year_group_id);

-- Move performance_categories from team-level to year-group-level
ALTER TABLE public.performance_categories ADD COLUMN year_group_id UUID REFERENCES public.year_groups(id) ON DELETE CASCADE;

-- Create index for performance categories
CREATE INDEX idx_performance_categories_year_group_id ON public.performance_categories(year_group_id);

-- Create club_join_codes table for club-level invitations
CREATE TABLE public.club_join_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  role_type TEXT NOT NULL, -- 'club_admin', 'global_staff', 'year_group_manager'
  created_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for club_join_codes
ALTER TABLE public.club_join_codes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for club_join_codes
CREATE POLICY "Club admins can manage club join codes" 
ON public.club_join_codes 
FOR ALL 
USING (is_user_club_admin_secure(club_id, auth.uid()))
WITH CHECK (is_user_club_admin_secure(club_id, auth.uid()));

CREATE POLICY "Anyone can view active club join codes for joining" 
ON public.club_join_codes 
FOR SELECT 
USING (is_active = true AND expires_at > now());

-- Create function to generate club join codes
CREATE OR REPLACE FUNCTION public.generate_club_join_code(p_club_name TEXT, p_role_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    base_code TEXT;
    counter INTEGER := 0;
    final_code TEXT;
    code_exists BOOLEAN;
BEGIN
    -- Create base code from club name and role
    base_code := UPPER(
        SUBSTRING(REGEXP_REPLACE(p_club_name, '[^A-Za-z0-9]', '', 'g'), 1, 4) ||
        CASE p_role_type
            WHEN 'club_admin' THEN 'ADM'
            WHEN 'global_staff' THEN 'STF'
            WHEN 'year_group_manager' THEN 'YGM'
            ELSE 'GEN'
        END
    );
    
    -- Ensure minimum length
    WHILE LENGTH(base_code) < 6 LOOP
        base_code := base_code || CHR(65 + FLOOR(RANDOM() * 26)::INTEGER);
    END LOOP;
    
    -- Find unique code
    LOOP
        IF counter = 0 THEN
            final_code := base_code;
        ELSE
            final_code := base_code || LPAD(counter::TEXT, 2, '0');
        END IF;
        
        SELECT EXISTS(SELECT 1 FROM public.club_join_codes WHERE code = final_code) INTO code_exists;
        
        IF NOT code_exists THEN
            RETURN final_code;
        END IF;
        
        counter := counter + 1;
        
        IF counter > 99 THEN
            RETURN base_code || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        END IF;
    END LOOP;
END;
$$;

-- Create function to handle team splitting
CREATE OR REPLACE FUNCTION public.split_team(
    p_source_team_id UUID,
    p_new_team_name TEXT,
    p_player_ids_for_new_team UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_team_id UUID;
    source_team RECORD;
    player_id UUID;
BEGIN
    -- Get source team details
    SELECT * INTO source_team FROM teams WHERE id = p_source_team_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Source team not found';
    END IF;
    
    -- Create new team based on source team
    INSERT INTO teams (
        name,
        age_group,
        season_start,
        season_end,
        year_group_id,
        club_id,
        subscription_type,
        game_format,
        game_duration,
        kit_icons,
        logo_url,
        performance_categories,
        manager_name,
        manager_email,
        manager_phone,
        home_location,
        home_latitude,
        home_longitude,
        privacy_settings,
        kit_designs,
        player_attributes,
        fa_connection,
        name_display_option,
        header_display_type,
        header_image_url
    )
    SELECT 
        p_new_team_name,
        age_group,
        season_start,
        season_end,
        year_group_id,
        club_id,
        subscription_type,
        game_format,
        game_duration,
        kit_icons,
        logo_url,
        performance_categories,
        manager_name,
        manager_email,
        manager_phone,
        home_location,
        home_latitude,
        home_longitude,
        privacy_settings,
        kit_designs,
        player_attributes,
        fa_connection,
        name_display_option,
        header_display_type,
        header_image_url
    FROM teams 
    WHERE id = p_source_team_id
    RETURNING id INTO new_team_id;
    
    -- Move specified players to new team
    FOREACH player_id IN ARRAY p_player_ids_for_new_team
    LOOP
        UPDATE players 
        SET team_id = new_team_id,
            updated_at = now()
        WHERE id = player_id AND team_id = p_source_team_id;
    END LOOP;
    
    -- Copy team staff to new team (they can manage both teams initially)
    INSERT INTO team_staff (
        team_id,
        name,
        email,
        role,
        phone,
        user_id,
        linking_code,
        pvg_checked,
        pvg_checked_by,
        pvg_checked_at,
        coaching_badges,
        certificates
    )
    SELECT 
        new_team_id,
        name,
        email,
        role,
        phone,
        user_id,
        linking_code,
        pvg_checked,
        pvg_checked_by,
        pvg_checked_at,
        coaching_badges,
        certificates
    FROM team_staff 
    WHERE team_id = p_source_team_id;
    
    -- Generate team join code for new team if generate_team_join_code function exists
    UPDATE teams 
    SET team_join_code = CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_team_join_code') 
        THEN generate_team_join_code(p_new_team_name)
        ELSE UPPER(SUBSTRING(p_new_team_name, 1, 6)) || LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0')
    END
    WHERE id = new_team_id;
    
    RETURN new_team_id;
END;
$$;

-- Create trigger to update updated_at for year_groups
CREATE TRIGGER update_year_groups_updated_at
BEFORE UPDATE ON public.year_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();