-- Create a more efficient batch-based regeneration function
CREATE OR REPLACE FUNCTION public.regenerate_player_stats_batch_safe()
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
    batch_size INTEGER := 100;
    total_processed INTEGER := 0;
    current_batch INTEGER := 0;
BEGIN
    -- Clear all existing event_player_stats
    DELETE FROM event_player_stats;
    RAISE NOTICE 'Cleared all event_player_stats records';
    
    -- Process in batches to avoid timeout
    LOOP
        -- Insert batch with standardized positions
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
        )
        SELECT 
            es.event_id,
            (pp->>'playerId')::UUID as player_id,
            COALESCE(es.team_number, 1) as team_number,
            COALESCE(es.period_number, 1) as period_number,
            standardize_position_name(pp->>'position') as position,
            COALESCE((pp->>'minutes')::INTEGER, es.duration_minutes, 90) as minutes_played,
            COALESCE((pp->>'playerId')::UUID = es.captain_id, false) as is_captain,
            COALESCE((pp->>'isSubstitute')::BOOLEAN, false) as is_substitute,
            (pp->>'substitution_time')::INTEGER as substitution_time,
            es.performance_category_id
        FROM event_selections es
        CROSS JOIN jsonb_array_elements(es.player_positions) as pp
        WHERE (pp->>'playerId') IS NOT NULL
        AND (pp->>'position') IS NOT NULL
        AND (pp->>'position') != ''
        ORDER BY es.created_at
        LIMIT batch_size OFFSET (current_batch * batch_size);
        
        -- Check if we processed any rows
        GET DIAGNOSTICS current_batch = ROW_COUNT;
        
        IF current_batch = 0 THEN
            EXIT; -- No more rows to process
        END IF;
        
        total_processed := total_processed + current_batch;
        current_batch := current_batch + 1;
        
        -- Commit every 100 records to avoid locks
        COMMIT;
        
        RAISE NOTICE 'Processed % records so far...', total_processed;
    END LOOP;
    
    RAISE NOTICE 'Successfully processed % total records with standardized positions', total_processed;
END;
$function$;

-- Create a simple function to update a single player's stats
CREATE OR REPLACE FUNCTION public.update_single_player_stats(player_uuid uuid)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
    stats_json JSONB;
BEGIN
    -- Calculate player's match statistics
    WITH player_games AS (
        SELECT 
            eps.event_id,
            e.date,
            e.opponent,
            e.title,
            e.player_of_match_id,
            eps.position,
            eps.minutes_played,
            eps.is_captain,
            eps.is_substitute,
            pc.name as performance_category
        FROM event_player_stats eps
        JOIN events e ON eps.event_id = e.id
        LEFT JOIN performance_categories pc ON eps.performance_category_id = pc.id
        WHERE eps.player_id = player_uuid
        AND eps.minutes_played > 0
        AND e.date <= CURRENT_DATE
    ),
    summary_stats AS (
        SELECT 
            COUNT(*) as total_games,
            SUM(minutes_played) as total_minutes,
            COUNT(*) FILTER (WHERE is_captain) as captain_games,
            COUNT(*) FILTER (WHERE player_of_match_id = player_uuid) as potm_count
        FROM player_games
    ),
    position_stats AS (
        SELECT 
            jsonb_object_agg(position, total_minutes) as minutes_by_position
        FROM (
            SELECT 
                position,
                SUM(minutes_played) as total_minutes
            FROM player_games
            WHERE position IS NOT NULL
            GROUP BY position
        ) pos
    ),
    recent_games AS (
        SELECT 
            jsonb_agg(
                jsonb_build_object(
                    'id', event_id,
                    'date', date,
                    'opponent', COALESCE(opponent, 'Unknown'),
                    'performanceCategory', performance_category,
                    'minutes', minutes_played,
                    'minutesByPosition', jsonb_build_object(position, minutes_played),
                    'captain', is_captain,
                    'playerOfTheMatch', player_of_match_id = player_uuid,
                    'wasSubstitute', is_substitute
                )
                ORDER BY date DESC
            ) as recent_games_data
        FROM (
            SELECT * FROM player_games ORDER BY date DESC LIMIT 10
        ) recent
    )
    SELECT jsonb_build_object(
        'totalGames', ss.total_games,
        'totalMinutes', ss.total_minutes,
        'captainGames', ss.captain_games,
        'playerOfTheMatchCount', ss.potm_count,
        'minutesByPosition', COALESCE(ps.minutes_by_position, '{}'::jsonb),
        'recentGames', COALESCE(rg.recent_games_data, '[]'::jsonb)
    )
    INTO stats_json
    FROM summary_stats ss
    CROSS JOIN position_stats ps
    CROSS JOIN recent_games rg;
    
    -- Update player
    UPDATE players 
    SET match_stats = stats_json,
        updated_at = now()
    WHERE id = player_uuid;
END;
$function$;