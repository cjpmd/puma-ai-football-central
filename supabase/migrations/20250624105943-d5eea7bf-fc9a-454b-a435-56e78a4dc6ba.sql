
-- Fix the regeneration function to properly handle position data and ensure correct position mapping
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
    position_text TEXT;
    minutes_played INTEGER;
    is_captain_value BOOLEAN;
    is_substitute_value BOOLEAN;
    processed_combinations TEXT[];
    combination_key TEXT;
BEGIN
    -- Clear all existing event_player_stats with a proper WHERE clause
    DELETE FROM event_player_stats WHERE id IS NOT NULL;
    
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
                
                -- Extract position - this is the key fix to ensure we get the exact position saved
                position_text := player_position->>'position';
                
                -- Skip if no position (shouldn't happen but safety check)
                CONTINUE WHEN position_text IS NULL OR position_text = '';
                
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
                
                -- Determine if this is a substitute position - be more explicit about substitute detection
                is_substitute_value := COALESCE(
                    (player_position->>'isSubstitute')::BOOLEAN,
                    position_text = 'SUB',
                    position_text = 'Substitute',
                    false
                );
                
                -- Log detailed information for Ferry Athletic matches and Mason specifically
                IF EXISTS (
                    SELECT 1 FROM events e 
                    WHERE e.id = selection_record.event_id 
                    AND (LOWER(e.opponent) LIKE '%ferry%' OR LOWER(e.title) LIKE '%ferry%')
                ) AND player_id = 'bb4de0de-c98c-485b-85b6-b70dd67736e4' THEN
                    RAISE NOTICE 'FERRY MATCH - MASON PROCESSING: Position=%, IsSubstitute=%, Minutes=%, Team=%, Period=%', 
                        position_text, is_substitute_value, minutes_played, 
                        COALESCE(selection_record.team_number, 1), COALESCE(selection_record.period_number, 1);
                END IF;
                
                -- Insert player stats record with the exact position from the selection
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
                    position_text, -- Use the exact position from the selection
                    minutes_played,
                    is_captain_value,
                    is_substitute_value,
                    (player_position->>'substitution_time')::INTEGER,
                    selection_record.performance_category_id
                );
            END LOOP;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Regenerated event_player_stats for all events with % combinations processed', array_length(processed_combinations, 1);
END;
$function$;

-- Also create a specific function to verify position data for debugging
CREATE OR REPLACE FUNCTION public.debug_player_positions(p_player_id UUID, p_player_name TEXT DEFAULT 'Unknown')
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    selection_record RECORD;
    player_position JSONB;
    stats_record RECORD;
BEGIN
    RAISE NOTICE '=== DEBUGGING POSITIONS FOR % (%) ===', p_player_name, p_player_id;
    
    -- Check event_selections data
    RAISE NOTICE '--- EVENT SELECTIONS DATA ---';
    FOR selection_record IN 
        SELECT es.*, e.title, e.opponent, e.date
        FROM event_selections es
        JOIN events e ON es.event_id = e.id
        WHERE es.player_positions::text LIKE '%' || p_player_id || '%'
        ORDER BY e.date DESC
        LIMIT 5
    LOOP
        RAISE NOTICE 'Event: % vs % (%)', selection_record.title, selection_record.opponent, selection_record.date;
        
        -- Find this player in the player_positions array
        FOR player_position IN SELECT * FROM jsonb_array_elements(selection_record.player_positions)
        LOOP
            IF (player_position->>'playerId')::UUID = p_player_id OR (player_position->>'player_id')::UUID = p_player_id THEN
                RAISE NOTICE '  Selection Position: %, IsSubstitute: %, Minutes: %', 
                    player_position->>'position', 
                    COALESCE((player_position->>'isSubstitute')::BOOLEAN, false),
                    COALESCE((player_position->>'minutes')::INTEGER, selection_record.duration_minutes, 90);
            END IF;
        END LOOP;
    END LOOP;
    
    -- Check event_player_stats data
    RAISE NOTICE '--- EVENT PLAYER STATS DATA ---';
    FOR stats_record IN 
        SELECT eps.*, e.title, e.opponent, e.date
        FROM event_player_stats eps
        JOIN events e ON eps.event_id = e.id
        WHERE eps.player_id = p_player_id
        ORDER BY e.date DESC
        LIMIT 5
    LOOP
        RAISE NOTICE 'Event: % vs % (%) - Stats Position: %, IsSubstitute: %, Minutes: %', 
            stats_record.title, stats_record.opponent, stats_record.date,
            stats_record.position, stats_record.is_substitute, stats_record.minutes_played;
    END LOOP;
    
    RAISE NOTICE '=== END DEBUG FOR % ===', p_player_name;
END;
$function$;
