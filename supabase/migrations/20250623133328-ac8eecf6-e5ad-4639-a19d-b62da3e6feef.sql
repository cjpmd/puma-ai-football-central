
-- Drop and recreate the update_player_match_stats function with comprehensive fixes
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
    AND eps.is_substitute = false  -- Only count actual playing time, not substitute bench time
    AND e.date <= CURRENT_DATE
    AND (e.end_time IS NULL OR e.end_time <= CURRENT_TIME OR e.date < CURRENT_DATE);

    -- Calculate total minutes (only actual playing time, exclude substitute bench time)
    SELECT COALESCE(SUM(eps.minutes_played), 0)
    INTO total_minutes_count
    FROM event_player_stats eps
    JOIN events e ON eps.event_id = e.id
    WHERE eps.player_id = player_uuid
    AND eps.minutes_played > 0
    AND eps.is_substitute = false  -- Exclude substitute bench time
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

    -- Calculate minutes by position (aggregate all minutes for each position, excluding substitutes)
    SELECT COALESCE(
        jsonb_object_agg(
            position, 
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
        AND eps.is_substitute = false  -- Only count actual playing positions
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
            eps.position,
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
        GROUP BY eps.performance_category_id, eps.position
    ),
    category_positions AS (
        SELECT 
            performance_category_id,
            jsonb_object_agg(position, minutes_played) as minutes_by_position
        FROM position_minutes
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

    -- Get recent games with proper position aggregation
    WITH game_aggregates AS (
        SELECT 
            e.id,
            e.date,
            e.opponent,
            e.title,
            e.start_time,
            e.player_of_match_id,
            pc.name as performance_category,
            -- Sum only playing minutes (not substitute bench time)
            SUM(CASE WHEN eps.is_substitute = false THEN eps.minutes_played ELSE 0 END) as playing_minutes,
            -- Sum substitute minutes separately
            SUM(CASE WHEN eps.is_substitute = true THEN eps.minutes_played ELSE 0 END) as substitute_minutes,
            -- Aggregate positions with their minutes (exclude substitutes)
            jsonb_object_agg(
                eps.position, 
                eps.minutes_played
            ) FILTER (
                WHERE eps.position IS NOT NULL 
                AND eps.position != 'SUB' 
                AND eps.position != 'Substitute'
                AND eps.minutes_played > 0 
                AND eps.is_substitute = false
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

-- Also update the regeneration function to ensure proper data population
DROP FUNCTION IF EXISTS public.regenerate_all_event_player_stats();

CREATE OR REPLACE FUNCTION public.regenerate_all_event_player_stats()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    event_record RECORD;
    selection_record RECORD;
    player_position JSONB;
    player_id UUID;
    minutes_played INTEGER;
    is_captain_value BOOLEAN;
    processed_combinations TEXT[];
    combination_key TEXT;
BEGIN
    -- Clear all existing event_player_stats
    DELETE FROM event_player_stats;
    
    -- Initialize tracking array
    processed_combinations := ARRAY[]::TEXT[];
    
    -- Regenerate from all event_selections
    FOR event_record IN SELECT DISTINCT event_id FROM event_selections
    LOOP
        -- Get all selections for this event
        FOR selection_record IN 
            SELECT * FROM event_selections WHERE event_id = event_record.event_id
        LOOP
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
                
                -- Create unique combination key
                combination_key := player_id::TEXT || '|' || 
                                 selection_record.event_id::TEXT || '|' || 
                                 COALESCE(selection_record.team_number, 1)::TEXT || '|' || 
                                 COALESCE(selection_record.period_number, 1)::TEXT;
                
                -- Skip if already processed
                CONTINUE WHEN combination_key = ANY(processed_combinations);
                
                -- Add to processed list
                processed_combinations := array_append(processed_combinations, combination_key);
                
                -- Calculate minutes played
                minutes_played := COALESCE(
                    (player_position->>'minutes')::INTEGER,
                    selection_record.duration_minutes,
                    90
                );
                
                -- Calculate is_captain properly handling null values
                is_captain_value := COALESCE(player_id = selection_record.captain_id, false);
                
                -- Determine if this is a substitute position
                DECLARE
                    position_text TEXT;
                    is_substitute_value BOOLEAN;
                BEGIN
                    position_text := player_position->>'position';
                    is_substitute_value := COALESCE(
                        (player_position->>'isSubstitute')::BOOLEAN,
                        position_text = 'SUB',
                        position_text = 'Substitute',
                        false
                    );
                    
                    -- Insert player stats record
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
                        position_text,
                        minutes_played,
                        is_captain_value,
                        is_substitute_value,
                        (player_position->>'substitution_time')::INTEGER,
                        selection_record.performance_category_id
                    );
                END;
            END LOOP;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Regenerated event_player_stats for all events with % combinations processed', array_length(processed_combinations, 1);
END;
$function$;
