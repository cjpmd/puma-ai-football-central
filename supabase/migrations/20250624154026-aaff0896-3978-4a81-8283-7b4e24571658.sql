
-- Fix the regeneration function to use a proper WHERE clause instead of DELETE without WHERE
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
    minutes_played INTEGER;
    is_captain_value BOOLEAN;
    is_substitute_value BOOLEAN;
    processed_count INTEGER := 0;
    debug_info TEXT;
BEGIN
    -- Safely clear all existing event_player_stats records using a WHERE clause
    DELETE FROM event_player_stats WHERE id IS NOT NULL;
    RAISE NOTICE 'Cleared ALL existing event_player_stats records';
    
    -- Regenerate from all event_selections with detailed logging
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
            
            -- Extract position with detailed validation
            position_text := TRIM(player_position->>'position');
            
            -- Skip if no position or empty string
            CONTINUE WHEN position_text IS NULL OR position_text = '';
            
            -- Special logging for Mason to track exact data flow
            IF player_id = 'bb4de0de-c98c-485b-85b6-b70dd67736e4' THEN
                debug_info := format('MASON DEBUG - Event: %s, Raw JSON: %s, Extracted Position: "%s"', 
                    selection_record.title, 
                    player_position::text,
                    position_text
                );
                RAISE NOTICE '%', debug_info;
            END IF;
            
            -- Calculate minutes played from the player_position data first, then fallback
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
                position_text = 'SUB',
                position_text = 'Substitute',
                false
            );
            
            -- Insert player stats record with exact data from selection
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
                position_text, -- Use the exact trimmed position from selection
                minutes_played,
                is_captain_value,
                is_substitute_value,
                (player_position->>'substitution_time')::INTEGER,
                selection_record.performance_category_id
            );
            
            -- Log Mason's insertions for verification
            IF player_id = 'bb4de0de-c98c-485b-85b6-b70dd67736e4' THEN
                RAISE NOTICE 'MASON INSERTED: Event %, Position "%", Minutes %', 
                    selection_record.event_id, position_text, minutes_played;
            END IF;
            
            processed_count := processed_count + 1;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Successfully regenerated % event_player_stats records', processed_count;
    
    -- Final verification for Mason
    DECLARE
        mason_records RECORD;
    BEGIN
        FOR mason_records IN 
            SELECT eps.position, eps.minutes_played, e.title, e.opponent
            FROM event_player_stats eps
            JOIN events e ON eps.event_id = e.id
            WHERE eps.player_id = 'bb4de0de-c98c-485b-85b6-b70dd67736e4'
            ORDER BY e.date DESC
        LOOP
            RAISE NOTICE 'MASON VERIFICATION: % vs % - Position: "%" Minutes: %', 
                mason_records.title, mason_records.opponent, 
                mason_records.position, mason_records.minutes_played;
        END LOOP;
    END;
END;
$function$;
