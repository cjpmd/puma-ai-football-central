
-- Fix the regeneration function to use a WHERE clause
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
