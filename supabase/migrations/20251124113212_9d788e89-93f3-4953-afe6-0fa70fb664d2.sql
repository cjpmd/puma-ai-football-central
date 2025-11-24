-- Fix calculate_event_score to only include teams that exist
CREATE OR REPLACE FUNCTION public.calculate_event_score(event_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    score_data jsonb := '{}'::jsonb;
    team1_exists boolean := false;
    team2_exists boolean := false;
    team1_goals integer := 0;
    team2_goals integer := 0;
BEGIN
    -- Check if team 1 exists for this event
    SELECT EXISTS(
        SELECT 1 FROM event_selections 
        WHERE event_id = event_uuid 
        AND team_number = 1
    ) INTO team1_exists;
    
    -- Check if team 2 exists for this event
    SELECT EXISTS(
        SELECT 1 FROM event_selections 
        WHERE event_id = event_uuid 
        AND team_number = 2
    ) INTO team2_exists;
    
    -- Only count goals if the team exists
    IF team1_exists THEN
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
        
        score_data := score_data || jsonb_build_object('team_1', team1_goals::text);
    END IF;
    
    IF team2_exists THEN
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
        
        score_data := score_data || jsonb_build_object('team_2', team2_goals::text);
    END IF;
    
    RETURN score_data;
END;
$function$;