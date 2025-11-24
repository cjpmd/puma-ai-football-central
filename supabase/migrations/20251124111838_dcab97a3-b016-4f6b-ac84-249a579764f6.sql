-- Add match events statistics to player stats
-- This migration updates the update_player_match_stats function to include
-- goals, assists, saves, and cards from the match_events table

CREATE OR REPLACE FUNCTION public.update_player_match_stats(player_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    total_games_count INTEGER;
    total_minutes_count INTEGER;
    captain_games_count INTEGER;
    potm_count INTEGER;
    total_goals_count INTEGER;
    total_assists_count INTEGER;
    total_saves_count INTEGER;
    yellow_cards_count INTEGER;
    red_cards_count INTEGER;
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

    -- NEW: Calculate match events statistics
    SELECT 
        COUNT(*) FILTER (WHERE event_type = 'goal'),
        COUNT(*) FILTER (WHERE event_type = 'assist'),
        COUNT(*) FILTER (WHERE event_type = 'save'),
        COUNT(*) FILTER (WHERE event_type = 'yellow_card'),
        COUNT(*) FILTER (WHERE event_type = 'red_card')
    INTO 
        total_goals_count,
        total_assists_count,
        total_saves_count,
        yellow_cards_count,
        red_cards_count
    FROM match_events me
    JOIN events e ON me.event_id = e.id
    WHERE me.player_id = player_uuid
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

    -- Get recent games with position aggregation AND match events per game
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
    match_events_per_game AS (
        SELECT 
            me.event_id,
            COUNT(*) FILTER (WHERE me.event_type = 'goal') as goals,
            COUNT(*) FILTER (WHERE me.event_type = 'assist') as assists,
            COUNT(*) FILTER (WHERE me.event_type = 'save') as saves,
            COUNT(*) FILTER (WHERE me.event_type = 'yellow_card') as yellow_cards,
            COUNT(*) FILTER (WHERE me.event_type = 'red_card') as red_cards
        FROM match_events me
        JOIN events e ON me.event_id = e.id
        WHERE me.player_id = player_uuid
        AND e.date <= CURRENT_DATE
        GROUP BY me.event_id
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
            jsonb_object_agg(pt.position, pt.position_minutes) FILTER (WHERE pt.position IS NOT NULL) as minutes_by_position_per_game,
            COALESCE(me.goals, 0) as goals,
            COALESCE(me.assists, 0) as assists,
            COALESCE(me.saves, 0) as saves,
            COALESCE(me.yellow_cards, 0) as yellow_cards,
            COALESCE(me.red_cards, 0) as red_cards
        FROM game_info gi
        LEFT JOIN position_totals_per_game pt ON pt.event_id = gi.event_id
        LEFT JOIN match_events_per_game me ON me.event_id = gi.event_id
        GROUP BY gi.event_id, gi.date, gi.opponent, gi.title, gi.player_of_match_id, 
                 gi.performance_category, gi.is_captain, gi.was_substitute, gi.total_game_minutes,
                 me.goals, me.assists, me.saves, me.yellow_cards, me.red_cards
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
                'wasSubstitute', gp.was_substitute,
                'goals', gp.goals,
                'assists', gp.assists,
                'saves', gp.saves,
                'yellowCards', gp.yellow_cards,
                'redCards', gp.red_cards
            )
        ),
        '[]'::jsonb
    )
    INTO recent_games_data
    FROM game_positions gp;

    -- Update the player's match_stats with all statistics including match events
    UPDATE players
    SET match_stats = jsonb_build_object(
        'totalGames', total_games_count,
        'totalMinutes', total_minutes_count,
        'totalGoals', total_goals_count,
        'totalAssists', total_assists_count,
        'totalSaves', total_saves_count,
        'yellowCards', yellow_cards_count,
        'redCards', red_cards_count,
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

-- Create function to calculate event score from match events
CREATE OR REPLACE FUNCTION public.calculate_event_score(event_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    score_data jsonb;
    team1_goals integer := 0;
    team2_goals integer := 0;
BEGIN
    -- Count goals for each team based on which team the player was on
    -- Team 1 goals
    SELECT COUNT(*)
    INTO team1_goals
    FROM match_events me
    WHERE me.event_id = event_uuid
    AND me.event_type = 'goal'
    AND me.team_id IN (
        SELECT DISTINCT es.team_id
        FROM event_selections es
        WHERE es.event_id = event_uuid
        AND es.team_number = 1
    );
    
    -- Team 2 goals (if exists)
    SELECT COUNT(*)
    INTO team2_goals
    FROM match_events me
    WHERE me.event_id = event_uuid
    AND me.event_type = 'goal'
    AND me.team_id IN (
        SELECT DISTINCT es.team_id
        FROM event_selections es
        WHERE es.event_id = event_uuid
        AND es.team_number = 2
    );
    
    -- Build score object
    score_data := jsonb_build_object(
        'team_1', team1_goals::text,
        'team_2', team2_goals::text
    );
    
    RETURN score_data;
END;
$function$;