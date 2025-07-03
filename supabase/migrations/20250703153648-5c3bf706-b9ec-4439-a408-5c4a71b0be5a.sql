-- Fix permissions for the player stats function
CREATE OR REPLACE FUNCTION public.update_player_match_stats(player_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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
    -- Calculate total games (count distinct events where player played)
    SELECT COUNT(DISTINCT event_id)
    INTO total_games_count
    FROM event_player_stats eps
    JOIN events e ON eps.event_id = e.id
    WHERE eps.player_id = player_uuid
    AND eps.minutes_played > 0
    AND e.date <= CURRENT_DATE;

    -- Calculate total minutes across all periods
    SELECT COALESCE(SUM(eps.minutes_played), 0)
    INTO total_minutes_count
    FROM event_player_stats eps
    JOIN events e ON eps.event_id = e.id
    WHERE eps.player_id = player_uuid
    AND eps.minutes_played > 0
    AND e.date <= CURRENT_DATE;

    -- Calculate captain games
    SELECT COUNT(DISTINCT event_id)
    INTO captain_games_count
    FROM event_player_stats eps
    JOIN events e ON eps.event_id = e.id
    WHERE eps.player_id = player_uuid
    AND eps.is_captain = true
    AND e.date <= CURRENT_DATE;

    -- Calculate POTM count
    SELECT COUNT(*)
    INTO potm_count
    FROM events e
    WHERE e.player_of_match_id = player_uuid
    AND e.date <= CURRENT_DATE;

    -- Calculate total minutes by position across all games
    SELECT COALESCE(
        jsonb_object_agg(position, total_minutes),
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
        AND eps.minutes_played > 0
        AND e.date <= CURRENT_DATE
        GROUP BY eps.position
    ) pos_stats;

    -- Calculate performance category statistics
    SELECT COALESCE(
        jsonb_object_agg(
            category_name,
            jsonb_build_object(
                'games', games_count,
                'minutes', total_minutes,
                'captainGames', captain_games,
                'averageMinutes', ROUND(total_minutes::decimal / games_count, 1)
            )
        ),
        '{}'::jsonb
    )
    INTO performance_category_stats
    FROM (
        SELECT 
            COALESCE(pc.name, 'No Category') as category_name,
            COUNT(DISTINCT eps.event_id) as games_count,
            SUM(eps.minutes_played) as total_minutes,
            COUNT(DISTINCT eps.event_id) FILTER (WHERE eps.is_captain = true) as captain_games
        FROM event_player_stats eps
        JOIN events e ON eps.event_id = e.id
        LEFT JOIN performance_categories pc ON eps.performance_category_id = pc.id
        WHERE eps.player_id = player_uuid
        AND eps.minutes_played > 0
        AND e.date <= CURRENT_DATE
        GROUP BY pc.name
    ) category_stats;

    -- Get recent games with proper position aggregation PER GAME
    WITH position_totals_per_game AS (
        SELECT 
            eps.event_id,
            eps.position,
            SUM(eps.minutes_played) as position_minutes
        FROM event_player_stats eps
        JOIN events e ON eps.event_id = e.id
        WHERE eps.player_id = player_uuid
        AND eps.position IS NOT NULL
        AND eps.minutes_played > 0
        AND e.date <= CURRENT_DATE
        GROUP BY eps.event_id, eps.position
    ),
    game_info AS (
        SELECT DISTINCT
            e.id as event_id,
            e.date,
            e.opponent,
            e.title,
            e.player_of_match_id,
            MAX(pc.name) as performance_category,
            bool_or(eps.is_captain) as is_captain,
            bool_or(eps.is_substitute) as was_substitute,
            SUM(eps.minutes_played) as total_game_minutes
        FROM event_player_stats eps
        JOIN events e ON eps.event_id = e.id
        LEFT JOIN performance_categories pc ON eps.performance_category_id = pc.id
        WHERE eps.player_id = player_uuid
        AND e.date <= CURRENT_DATE
        GROUP BY e.id, e.date, e.opponent, e.title, e.player_of_match_id
    ),
    game_positions AS (
        SELECT 
            gi.event_id,
            gi.date,
            gi.opponent,
            gi.title,
            gi.player_of_match_id,
            gi.performance_category,
            gi.is_captain,
            gi.was_substitute,
            gi.total_game_minutes,
            jsonb_object_agg(pt.position, pt.position_minutes) as minutes_by_position_per_game
        FROM game_info gi
        LEFT JOIN position_totals_per_game pt ON pt.event_id = gi.event_id
        GROUP BY gi.event_id, gi.date, gi.opponent, gi.title, gi.player_of_match_id, 
                 gi.performance_category, gi.is_captain, gi.was_substitute, gi.total_game_minutes
        ORDER BY gi.date DESC
        LIMIT 10
    )
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', gp.event_id,
                'date', gp.date,
                'opponent', COALESCE(gp.opponent, 'Unknown'),
                'performanceCategory', gp.performance_category,
                'minutes', gp.total_game_minutes,
                'minutesByPosition', COALESCE(gp.minutes_by_position_per_game, '{}'::jsonb),
                'captain', gp.is_captain,
                'playerOfTheMatch', gp.player_of_match_id = player_uuid,
                'wasSubstitute', gp.was_substitute
            )
        ),
        '[]'::jsonb
    )
    INTO recent_games_data
    FROM game_positions gp;

    -- Update the player's match_stats with performance category stats
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