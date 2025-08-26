-- Fix security warnings by setting search_path for functions
CREATE OR REPLACE FUNCTION generate_secure_notification_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  token TEXT;
  collision_count INTEGER := 0;
BEGIN
  LOOP
    -- Generate cryptographically secure random token
    token := encode(gen_random_bytes(32), 'base64url');
    
    -- Check for collisions
    IF NOT EXISTS (SELECT 1 FROM secure_notification_tokens WHERE token = token) THEN
      EXIT;
    END IF;
    
    collision_count := collision_count + 1;
    
    -- Prevent infinite loop
    IF collision_count > 10 THEN
      RAISE EXCEPTION 'Unable to generate unique notification token after multiple attempts';
    END IF;
  END LOOP;
  
  RETURN token;
END;
$$;

CREATE OR REPLACE FUNCTION schedule_event_reminders(p_event_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  event_record RECORD;
  event_datetime TIMESTAMP WITH TIME ZONE;
  three_hour_reminder TIMESTAMP WITH TIME ZONE;
  morning_reminder TIMESTAMP WITH TIME ZONE;
  target_users JSONB;
BEGIN
  -- Get event details
  SELECT * INTO event_record FROM events WHERE id = p_event_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found: %', p_event_id;
  END IF;
  
  -- Calculate event datetime
  event_datetime := event_record.date + COALESCE(event_record.start_time, '00:00:00'::time);
  
  -- Calculate reminder times
  three_hour_reminder := event_datetime - interval '3 hours';
  morning_reminder := event_record.date + '08:00:00'::time;
  
  -- Get target users (players, parents, staff)
  SELECT jsonb_agg(DISTINCT user_data.user_id) INTO target_users
  FROM (
    -- Players
    SELECT up.user_id FROM user_players up 
    JOIN players p ON p.id = up.player_id 
    WHERE p.team_id = event_record.team_id
    
    UNION
    
    -- Staff
    SELECT us.user_id FROM user_staff us 
    JOIN team_staff ts ON ts.id = us.staff_id 
    WHERE ts.team_id = event_record.team_id
    
    UNION
    
    -- Team members
    SELECT ut.user_id FROM user_teams ut 
    WHERE ut.team_id = event_record.team_id
  ) user_data;
  
  -- Schedule 3-hour reminder (only if event is more than 3 hours away)
  IF three_hour_reminder > now() THEN
    INSERT INTO scheduled_notifications (
      event_id, notification_type, scheduled_time, target_users, notification_data
    ) VALUES (
      p_event_id, '3_hour_reminder', three_hour_reminder, target_users,
      jsonb_build_object(
        'title', 'Event Reminder',
        'body', format('Reminder: %s starts in 3 hours at %s', 
          event_record.title, 
          COALESCE(event_record.location, 'TBD')),
        'event_type', event_record.event_type
      )
    );
  END IF;
  
  -- Schedule morning reminder (only if event is today or in the future)
  IF morning_reminder > now() AND event_record.date >= CURRENT_DATE THEN
    INSERT INTO scheduled_notifications (
      event_id, notification_type, scheduled_time, target_users, notification_data
    ) VALUES (
      p_event_id, 'morning_reminder', morning_reminder, target_users,
      jsonb_build_object(
        'title', 'Today''s Event',
        'body', format('Don''t forget: %s today at %s', 
          event_record.title, 
          COALESCE(event_record.start_time::text, 'TBD')),
        'event_type', event_record.event_type
      )
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_schedule_event_reminders()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- Schedule reminders for new or updated events
  PERFORM schedule_event_reminders(NEW.id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION cleanup_expired_notification_tokens()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM secure_notification_tokens WHERE expires_at < now();
END;
$$;