-- Create a simple, reliable function to clean and regenerate data
CREATE OR REPLACE FUNCTION public.clean_and_regenerate_player_stats()
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Step 1: Clear all event_player_stats
    DELETE FROM event_player_stats;
    RAISE NOTICE 'Cleared all event_player_stats records';
    
    -- Step 2: Regenerate from event_selections with proper logic
    INSERT INTO event_player_stats (
        event_id,
        player_id,
        team_number,
        period_number,
        position,
        minutes_played,
        is_captain,
        is_substitute,
        performance_category_id
    )
    SELECT DISTINCT
        es.event_id,
        (pp->>'playerId')::UUID as player_id,
        COALESCE(es.team_number, 1) as team_number,
        COALESCE(es.period_number, 1) as period_number,
        -- Use abbreviations for positions
        CASE 
            WHEN pp->>'position' = 'Midfielder Right' THEN 'RM'
            WHEN pp->>'position' = 'Midfielder Left' THEN 'LM'
            WHEN pp->>'position' = 'Midfielder Centre' THEN 'CM'
            WHEN pp->>'position' = 'Defender Right' THEN 'RB'
            WHEN pp->>'position' = 'Defender Left' THEN 'LB'
            WHEN pp->>'position' = 'Centre Back' THEN 'CB'
            WHEN pp->>'position' = 'Center Back' THEN 'CB'
            WHEN pp->>'position' = 'Striker Centre' THEN 'CF'
            WHEN pp->>'position' = 'Right Wing' THEN 'RW'
            WHEN pp->>'position' = 'Left Wing' THEN 'LW'
            WHEN pp->>'position' = 'Right Forward' THEN 'RF'
            WHEN pp->>'position' = 'Left Forward' THEN 'LF'
            WHEN pp->>'position' = 'Centre Forward' THEN 'CF'
            WHEN pp->>'position' = 'Central Midfielder' THEN 'CM'
            WHEN pp->>'position' = 'Right Midfielder' THEN 'RM'
            WHEN pp->>'position' = 'Left Midfielder' THEN 'LM'
            WHEN pp->>'position' = 'Goalkeeper' THEN 'GK'
            WHEN LOWER(pp->>'position') IN ('sub', 'substitute') THEN 'SUB'
            ELSE pp->>'position'
        END as position,
        COALESCE((pp->>'minutes')::INTEGER, es.duration_minutes, 90) as minutes_played,
        COALESCE((pp->>'playerId')::UUID = es.captain_id, false) as is_captain,
        COALESCE((pp->>'isSubstitute')::BOOLEAN, LOWER(pp->>'position') IN ('sub', 'substitute'), false) as is_substitute,
        es.performance_category_id
    FROM event_selections es
    CROSS JOIN jsonb_array_elements(es.player_positions) as pp
    WHERE (pp->>'playerId') IS NOT NULL
    AND (pp->>'position') IS NOT NULL
    AND (pp->>'position') != '';
    
    RAISE NOTICE 'Successfully regenerated event_player_stats with clean data';
END;
$function$;