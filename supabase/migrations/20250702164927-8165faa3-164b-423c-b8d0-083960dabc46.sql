-- Fix position naming inconsistencies and create a comprehensive solution

-- First, create a function to standardize position names
CREATE OR REPLACE FUNCTION public.standardize_position_name(input_position TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $function$
BEGIN
    -- Handle null or empty input
    IF input_position IS NULL OR TRIM(input_position) = '' THEN
        RETURN NULL;
    END IF;
    
    -- Normalize the input (trim and convert to lowercase for comparison)
    input_position := TRIM(input_position);
    
    -- Map various position formats to standardized names
    CASE LOWER(input_position)
        -- Goalkeeper variations
        WHEN 'gk', 'goalkeeper', 'goalie' THEN RETURN 'Goalkeeper';
        
        -- Defender variations
        WHEN 'defender left', 'left back', 'lb', 'dl' THEN RETURN 'Left Back';
        WHEN 'defender right', 'right back', 'rb', 'dr' THEN RETURN 'Right Back';
        WHEN 'defender centre', 'centre back', 'center back', 'cb', 'dc' THEN RETURN 'Centre Back';
        
        -- Midfielder variations
        WHEN 'midfielder left', 'left mid', 'left midfielder', 'ml', 'lm' THEN RETURN 'Left Midfielder';
        WHEN 'midfielder right', 'right mid', 'right midfielder', 'mr', 'rm' THEN RETURN 'Right Midfielder';
        WHEN 'midfielder centre', 'centre mid', 'center mid', 'central midfielder', 'cm', 'mc' THEN RETURN 'Central Midfielder';
        WHEN 'cdm', 'defensive midfielder' THEN RETURN 'Defensive Midfielder';
        WHEN 'cam', 'attacking midfielder' THEN RETURN 'Attacking Midfielder';
        
        -- Forward/Striker variations
        WHEN 'striker centre', 'centre forward', 'center forward', 'cf', 'st', 'stc' THEN RETURN 'Centre Forward';
        WHEN 'striker left', 'left forward', 'lf', 'stl' THEN RETURN 'Left Forward';
        WHEN 'striker right', 'right forward', 'rf', 'str' THEN RETURN 'Right Forward';
        WHEN 'left wing', 'left winger', 'lw' THEN RETURN 'Left Forward';
        WHEN 'right wing', 'right winger', 'rw' THEN RETURN 'Right Forward';
        
        -- Substitute
        WHEN 'sub', 'substitute', 'bench' THEN RETURN 'Substitute';
        
        -- Default: return the input with proper capitalization
        ELSE 
            -- Capitalize first letter of each word
            RETURN INITCAP(input_position);
    END CASE;
END;
$function$;

-- Update position_abbreviations table to have consistent standardized names
DELETE FROM position_abbreviations WHERE game_format = '7-a-side';

INSERT INTO position_abbreviations (game_format, position_name, abbreviation, position_group, display_order) VALUES
('7-a-side', 'Goalkeeper', 'GK', 'goalkeeper', 1),
('7-a-side', 'Right Back', 'RB', 'defender', 2),
('7-a-side', 'Centre Back', 'CB', 'defender', 3),
('7-a-side', 'Left Back', 'LB', 'defender', 4),
('7-a-side', 'Right Midfielder', 'RM', 'midfielder', 5),
('7-a-side', 'Central Midfielder', 'CM', 'midfielder', 6),
('7-a-side', 'Left Midfielder', 'LM', 'midfielder', 7),
('7-a-side', 'Right Forward', 'RF', 'forward', 8),
('7-a-side', 'Centre Forward', 'CF', 'forward', 9),
('7-a-side', 'Left Forward', 'LF', 'forward', 10);

-- Also add positions for 11-a-side
DELETE FROM position_abbreviations WHERE game_format = '11-a-side';

INSERT INTO position_abbreviations (game_format, position_name, abbreviation, position_group, display_order) VALUES
('11-a-side', 'Goalkeeper', 'GK', 'goalkeeper', 1),
('11-a-side', 'Right Back', 'RB', 'defender', 2),
('11-a-side', 'Centre Back', 'CB', 'defender', 3),
('11-a-side', 'Left Back', 'LB', 'defender', 4),
('11-a-side', 'Right Midfielder', 'RM', 'midfielder', 5),
('11-a-side', 'Central Midfielder', 'CM', 'midfielder', 6),
('11-a-side', 'Left Midfielder', 'LM', 'midfielder', 7),
('11-a-side', 'Defensive Midfielder', 'CDM', 'midfielder', 8),
('11-a-side', 'Attacking Midfielder', 'CAM', 'midfielder', 9),
('11-a-side', 'Right Forward', 'RW', 'forward', 10),
('11-a-side', 'Centre Forward', 'CF', 'forward', 11),
('11-a-side', 'Left Forward', 'LW', 'forward', 12);

-- Update the regeneration function to use standardized position names
DROP FUNCTION IF EXISTS public.regenerate_all_event_player_stats();

CREATE OR REPLACE FUNCTION public.regenerate_all_event_player_stats()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    selection_record RECORD;
    player_position JSONB;
    player_id UUID;
    position_text TEXT;
    standardized_position TEXT;
    minutes_played INTEGER;
    is_captain_value BOOLEAN;
    is_substitute_value BOOLEAN;
    processed_count INTEGER := 0;
    debug_info TEXT;
BEGIN
    -- Safely clear all existing event_player_stats records
    DELETE FROM event_player_stats WHERE id IS NOT NULL;
    RAISE NOTICE 'Cleared ALL existing event_player_stats records';
    
    -- Regenerate from all event_selections with position standardization
    FOR selection_record IN 
        SELECT es.*, e.title, e.opponent, e.date 
        FROM event_selections es
        JOIN events e ON es.event_id = e.id
        ORDER BY e.date DESC
    LOOP
        RAISE NOTICE 'Processing selection for event: % vs % (%)', 
            selection_record.title, selection_record.opponent, selection_record.date;
        
        -- Process each player position in the selection
        FOR player_position IN SELECT * FROM jsonb_array_elements(selection_record.player_positions)
        LOOP
            -- Extract player ID (handle both playerId and player_id formats)
            player_id := COALESCE(
                (player_position->>'playerId')::UUID,
                (player_position->>'player_id')::UUID
            );
            
            -- Skip if no valid player ID
            CONTINUE WHEN player_id IS NULL;
            
            -- Extract position and standardize it
            position_text := TRIM(player_position->>'position');
            
            -- Skip if no position or empty string
            CONTINUE WHEN position_text IS NULL OR position_text = '';
            
            -- Standardize the position name
            standardized_position := standardize_position_name(position_text);
            
            -- Calculate minutes played
            minutes_played := COALESCE(
                (player_position->>'minutes')::INTEGER,
                selection_record.duration_minutes,
                90
            );
            
            -- Calculate is_captain
            is_captain_value := COALESCE(player_id = selection_record.captain_id, false);
            
            -- Determine if this is a substitute position
            is_substitute_value := COALESCE(
                (player_position->>'isSubstitute')::BOOLEAN,
                LOWER(position_text) = 'sub',
                LOWER(position_text) = 'substitute',
                false
            );
            
            -- Insert player stats record with standardized position
            INSERT INTO event_player_stats (
                event_id,
                player_id,
                team_number,
                period_number,
                position,
                minutes_played,
                is_captain,
                is_substitute,
                substitution_time,
                performance_category_id
            ) VALUES (
                selection_record.event_id,
                player_id,
                COALESCE(selection_record.team_number, 1),
                COALESCE(selection_record.period_number, 1),
                standardized_position, -- Use standardized position
                minutes_played,
                is_captain_value,
                is_substitute_value,
                (player_position->>'substitution_time')::INTEGER,
                selection_record.performance_category_id
            );
            
            processed_count := processed_count + 1;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Successfully regenerated % event_player_stats records with standardized positions', processed_count;
END;
$function$;

-- Update the player match stats function to use standardized position names
DROP FUNCTION IF EXISTS public.update_player_match_stats(uuid);

CREATE OR REPLACE FUNCTION public.update_player_match_stats(player_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    total_games_count INTEGER;
    total_minutes_count INTEGER;
    captain_games_count INTEGER;
    potm_count INTEGER;
    minutes_by_pos JSONB;
    performance_category_stats JSONB;
    recent_games_data JSONB;
BEGIN
    -- Calculate total games (only count events where player actually played)
    SELECT COUNT(DISTINCT event_id)
    INTO total_games_count
    FROM event_player_stats eps
    JOIN events e ON eps.event_id = e.id
    WHERE eps.player_id = player_uuid
    AND eps.minutes_played > 0
    AND eps.is_substitute = false
    AND e.date <= CURRENT_DATE
    AND (e.end_time IS NULL OR e.end_time <= CURRENT_TIME OR e.date < CURRENT_DATE);

    -- Calculate total minutes
    SELECT COALESCE(SUM(eps.minutes_played), 0)
    INTO total_minutes_count
    FROM event_player_stats eps
    JOIN events e ON eps.event_id = e.id
    WHERE eps.player_id = player_uuid
    AND eps.minutes_played > 0
    AND eps.is_substitute = false
    AND e.date <= CURRENT_DATE
    AND (e.end_time IS NULL OR e.end_time <= CURRENT_TIME OR e.date < CURRENT_DATE);

    -- Calculate captain games
    SELECT COUNT(DISTINCT event_id)
    INTO captain_games_count
    FROM event_player_stats eps
    JOIN events e ON eps.event_id = e.id
    WHERE eps.player_id = player_uuid
    AND eps.is_captain = true
    AND e.date <= CURRENT_DATE
    AND (e.end_time IS NULL OR e.end_time <= CURRENT_TIME OR e.date < CURRENT_DATE);

    -- Calculate POTM count
    SELECT COUNT(*)
    INTO potm_count
    FROM events e
    WHERE e.player_of_match_id = player_uuid
    AND e.date <= CURRENT_DATE
    AND (e.end_time IS NULL OR e.end_time <= CURRENT_TIME OR e.date < CURRENT_DATE);

    -- Calculate minutes by position using standardized names
    SELECT COALESCE(
        jsonb_object_agg(
            standardize_position_name(position), 
            total_minutes
        ),
        '{}'::jsonb
    )
    INTO minutes_by_pos
    FROM (
        SELECT 
            eps.position,
            SUM(eps.minutes_played) as total_minutes
        FROM event_player_stats eps
        JOIN events e ON eps.event_id = e.id
        WHERE eps.player_id = player_uuid
        AND eps.position IS NOT NULL
        AND eps.position != 'SUB'
        AND eps.position != 'Substitute'
        AND eps.minutes_played > 0
        AND eps.is_substitute = false
        AND e.date <= CURRENT_DATE
        AND (e.end_time IS NULL OR e.end_time <= CURRENT_TIME OR e.date < CURRENT_DATE)
        GROUP BY eps.position
    ) pos_stats;

    -- Calculate performance category statistics
    WITH category_stats AS (
        SELECT 
            eps.performance_category_id,
            pc.name as category_name,
            SUM(CASE WHEN eps.is_substitute = false THEN eps.minutes_played ELSE 0 END) as total_minutes,
            COUNT(DISTINCT CASE WHEN eps.minutes_played > 0 AND eps.is_substitute = false THEN eps.event_id END) as total_games,
            COUNT(DISTINCT CASE WHEN eps.is_captain THEN eps.event_id END) as captain_games,
            COUNT(DISTINCT CASE WHEN e.player_of_match_id = player_uuid THEN eps.event_id END) as potm_count
        FROM event_player_stats eps
        JOIN events e ON eps.event_id = e.id
        JOIN performance_categories pc ON pc.id = eps.performance_category_id
        WHERE eps.player_id = player_uuid
        AND eps.performance_category_id IS NOT NULL
        AND e.date <= CURRENT_DATE
        AND (e.end_time IS NULL OR e.end_time <= CURRENT_TIME OR e.date < CURRENT_DATE)
        GROUP BY eps.performance_category_id, pc.name
    ),
    position_minutes AS (
        SELECT 
            eps.performance_category_id,
            standardize_position_name(eps.position) as standardized_position,
            SUM(eps.minutes_played) as minutes_played
        FROM event_player_stats eps
        JOIN events e ON eps.event_id = e.id
        WHERE eps.player_id = player_uuid
        AND eps.performance_category_id IS NOT NULL
        AND eps.position IS NOT NULL
        AND eps.position != 'SUB'
        AND eps.position != 'Substitute'
        AND eps.minutes_played > 0
        AND eps.is_substitute = false
        AND e.date <= CURRENT_DATE
        AND (e.end_time IS NULL OR e.end_time <= CURRENT_TIME OR e.date < CURRENT_DATE)
        GROUP BY eps.performance_category_id, standardize_position_name(eps.position)
    ),
    category_positions AS (
        SELECT 
            performance_category_id,
            jsonb_object_agg(standardized_position, minutes_played) as minutes_by_position
        FROM position_minutes
        WHERE standardized_position IS NOT NULL
        GROUP BY performance_category_id
    )
    SELECT COALESCE(
        jsonb_object_agg(
            cs.category_name,
            jsonb_build_object(
                'totalMinutes', cs.total_minutes,
                'totalGames', cs.total_games,
                'captainGames', cs.captain_games,
                'potmCount', cs.potm_count,
                'minutesByPosition', COALESCE(cp.minutes_by_position, '{}'::jsonb)
            )
        ),
        '{}'::jsonb
    )
    INTO performance_category_stats
    FROM category_stats cs
    LEFT JOIN category_positions cp ON cp.performance_category_id = cs.performance_category_id;

    -- Get recent games with standardized position aggregation
    WITH game_aggregates AS (
        SELECT 
            e.id,
            e.date,
            e.opponent,
            e.title,
            e.start_time,
            e.player_of_match_id,
            pc.name as performance_category,
            SUM(CASE WHEN eps.is_substitute = false THEN eps.minutes_played ELSE 0 END) as playing_minutes,
            SUM(CASE WHEN eps.is_substitute = true THEN eps.minutes_played ELSE 0 END) as substitute_minutes,
            jsonb_object_agg(
                standardize_position_name(eps.position), 
                eps.minutes_played
            ) FILTER (
                WHERE eps.position IS NOT NULL 
                AND eps.position != 'SUB' 
                AND eps.position != 'Substitute'
                AND eps.minutes_played > 0 
                AND eps.is_substitute = false
                AND standardize_position_name(eps.position) IS NOT NULL
            ) as minutes_by_position,
            bool_or(eps.is_captain) as is_captain,
            bool_or(eps.is_substitute) as was_substitute
        FROM event_player_stats eps
        JOIN events e ON eps.event_id = e.id
        LEFT JOIN performance_categories pc ON pc.id = eps.performance_category_id
        WHERE eps.player_id = player_uuid
        AND e.date <= CURRENT_DATE
        AND (e.end_time IS NULL OR e.end_time <= CURRENT_TIME OR e.date < CURRENT_DATE)
        GROUP BY e.id, e.date, e.opponent, e.title, e.start_time, e.player_of_match_id, pc.name
        ORDER BY e.date DESC, e.start_time DESC
        LIMIT 10
    )
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', ga.id,
                'date', ga.date,
                'opponent', COALESCE(ga.opponent, 'Unknown'),
                'performanceCategory', ga.performance_category,
                'minutes', ga.playing_minutes,
                'minutesByPosition', COALESCE(ga.minutes_by_position, '{}'::jsonb),
                'captain', ga.is_captain,
                'playerOfTheMatch', ga.player_of_match_id = player_uuid,
                'wasSubstitute', ga.was_substitute
            )
        ),
        '[]'::jsonb
    )
    INTO recent_games_data
    FROM game_aggregates ga;

    -- Update the player's match_stats
    UPDATE players
    SET match_stats = jsonb_build_object(
        'totalGames', total_games_count,
        'totalMinutes', total_minutes_count,
        'captainGames', captain_games_count,
        'playerOfTheMatchCount', potm_count,
        'minutesByPosition', minutes_by_pos,
        'performanceCategoryStats', performance_category_stats,
        'recentGames', recent_games_data
    ),
    updated_at = now()
    WHERE id = player_uuid;
END;
$function$;