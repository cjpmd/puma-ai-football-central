-- Update the send_availability_notifications function to automatically include coaches/staff
CREATE OR REPLACE FUNCTION public.send_availability_notifications(p_event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  event_record RECORD;
  selection_record RECORD;
  player_position JSONB;
  player_id UUID;
  user_profile RECORD;
  parent_profile RECORD;
  coach_record RECORD;
BEGIN
  -- Get event details
  SELECT * INTO event_record FROM events WHERE id = p_event_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found with id: %', p_event_id;
  END IF;
  
  -- Automatically create availability records for all coaches/staff of the team
  FOR coach_record IN 
    SELECT DISTINCT us.user_id, ts.id as staff_id
    FROM team_staff ts
    JOIN user_staff us ON ts.id = us.staff_id
    WHERE ts.team_id = event_record.team_id
    AND ts.role IN ('coach', 'assistant_coach', 'manager', 'assistant_manager')
  LOOP
    -- Create staff availability record
    INSERT INTO event_availability (event_id, user_id, role, status)
    VALUES (p_event_id, coach_record.user_id, 'staff', 'pending')
    ON CONFLICT (event_id, user_id, role) DO NOTHING;
  END LOOP;
  
  -- Get all event selections for this event (for players)
  FOR selection_record IN 
    SELECT * FROM event_selections WHERE event_id = p_event_id
  LOOP
    -- Process selected players
    FOR player_position IN SELECT * FROM jsonb_array_elements(selection_record.player_positions)
    LOOP
      player_id := COALESCE(
        (player_position->>'playerId')::UUID,
        (player_position->>'player_id')::UUID
      );
      
      IF player_id IS NOT NULL THEN
        -- Check if player has linked user account
        SELECT p.*, pr.* INTO user_profile 
        FROM players p 
        LEFT JOIN user_players up ON p.id = up.player_id
        LEFT JOIN profiles pr ON up.user_id = pr.id
        WHERE p.id = player_id;
        
        IF user_profile.id IS NOT NULL THEN
          -- Player has user account, send notification to player
          INSERT INTO event_availability (event_id, user_id, role, status)
          VALUES (p_event_id, user_profile.id, 'player', 'pending')
          ON CONFLICT (event_id, user_id, role) DO NOTHING;
        ELSE
          -- Check if player has parent account
          SELECT pr.* INTO parent_profile
          FROM players p
          LEFT JOIN user_players up ON p.id = up.player_id AND up.relationship = 'parent'
          LEFT JOIN profiles pr ON up.user_id = pr.id
          WHERE p.id = player_id;
          
          IF parent_profile.id IS NOT NULL THEN
            -- Send notification to parent
            INSERT INTO event_availability (event_id, user_id, role, status)
            VALUES (p_event_id, parent_profile.id, 'player', 'pending')
            ON CONFLICT (event_id, user_id, role) DO NOTHING;
          END IF;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Availability notifications created for event: %', p_event_id;
END;
$function$

-- Create a trigger to automatically send availability notifications when an event is created
CREATE OR REPLACE FUNCTION public.auto_send_availability_notifications()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Send notifications for new events
  IF TG_OP = 'INSERT' THEN
    PERFORM send_availability_notifications(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$function$

-- Create the trigger (if it doesn't exist)
DROP TRIGGER IF EXISTS auto_availability_notifications ON events;
CREATE TRIGGER auto_availability_notifications
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION auto_send_availability_notifications();