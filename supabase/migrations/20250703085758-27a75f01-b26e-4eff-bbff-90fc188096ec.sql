-- Fix the player match stats function to properly aggregate minutes per game
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

    -- Get recent games with proper position aggregation PER GAME
    WITH game_aggregates AS (
        SELECT 
            e.id,
            e.date,
            e.opponent,
            e.title,
            e.player_of_match_id,
            -- Aggregate positions and minutes per game
            jsonb_object_agg(
                eps.position, 
                SUM(eps.minutes_played)
            ) FILTER (
                WHERE eps.position IS NOT NULL 
                AND eps.minutes_played > 0
            ) as minutes_by_position_per_game,
            SUM(eps.minutes_played) as total_game_minutes,
            bool_or(eps.is_captain) as is_captain,
            bool_or(eps.is_substitute) as was_substitute,
            MAX(pc.name) as performance_category
        FROM event_player_stats eps
        JOIN events e ON eps.event_id = e.id
        LEFT JOIN performance_categories pc ON eps.performance_category_id = pc.id
        WHERE eps.player_id = player_uuid
        AND e.date <= CURRENT_DATE
        GROUP BY e.id, e.date, e.opponent, e.title, e.player_of_match_id
        ORDER BY e.date DESC
        LIMIT 10
    )
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', ga.id,
                'date', ga.date,
                'opponent', COALESCE(ga.opponent, 'Unknown'),
                'performanceCategory', ga.performance_category,
                'minutes', ga.total_game_minutes,
                'minutesByPosition', COALESCE(ga.minutes_by_position_per_game, '{}'::jsonb),
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
        'recentGames', recent_games_data
    ),
    updated_at = now()
    WHERE id = player_uuid;
END;
$function$;