-- Create scheduled_notifications table for managing automated reminders
CREATE TABLE public.scheduled_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('event_created', 'event_updated', '3_hour_reminder', 'morning_reminder', 'weekly_nudge')),
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  target_users JSONB NOT NULL DEFAULT '[]'::jsonb,
  notification_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create secure_notification_tokens table for deep linking
CREATE TABLE public.secure_notification_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  action_type TEXT CHECK (action_type IN ('view_event', 'rsvp_yes', 'rsvp_no', 'rsvp_maybe')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enhance notification_logs table
ALTER TABLE public.notification_logs ADD COLUMN IF NOT EXISTS scheduled_notification_id UUID REFERENCES scheduled_notifications(id);
ALTER TABLE public.notification_logs ADD COLUMN IF NOT EXISTS deep_link_token TEXT;
ALTER TABLE public.notification_logs ADD COLUMN IF NOT EXISTS notification_category TEXT;
ALTER TABLE public.notification_logs ADD COLUMN IF NOT EXISTS quick_actions JSONB DEFAULT '[]'::jsonb;

-- Create indexes for performance
CREATE INDEX idx_scheduled_notifications_event_id ON scheduled_notifications(event_id);
CREATE INDEX idx_scheduled_notifications_scheduled_time ON scheduled_notifications(scheduled_time);
CREATE INDEX idx_scheduled_notifications_status ON scheduled_notifications(status);
CREATE INDEX idx_secure_tokens_token ON secure_notification_tokens(token);
CREATE INDEX idx_secure_tokens_expires_at ON secure_notification_tokens(expires_at);

-- Enable RLS
ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secure_notification_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scheduled_notifications
CREATE POLICY "Team staff can manage scheduled notifications" ON scheduled_notifications
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM events e 
    JOIN user_teams ut ON ut.team_id = e.team_id 
    WHERE e.id = scheduled_notifications.event_id 
    AND ut.user_id = auth.uid() 
    AND ut.role = ANY(ARRAY['team_manager', 'team_assistant_manager', 'team_coach'])
  )
);

-- RLS Policies for secure_notification_tokens
CREATE POLICY "Users can view their own notification tokens" ON secure_notification_tokens
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can manage notification tokens" ON secure_notification_tokens
FOR ALL USING (true);

-- Function to generate secure notification tokens
CREATE OR REPLACE FUNCTION generate_secure_notification_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to schedule automatic reminders for an event
CREATE OR REPLACE FUNCTION schedule_event_reminders(p_event_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Trigger to automatically schedule reminders when events are created/updated
CREATE OR REPLACE FUNCTION trigger_schedule_event_reminders()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Schedule reminders for new or updated events
  PERFORM schedule_event_reminders(NEW.id);
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS auto_schedule_reminders ON events;
CREATE TRIGGER auto_schedule_reminders
  AFTER INSERT OR UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION trigger_schedule_event_reminders();

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_notification_tokens()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM secure_notification_tokens WHERE expires_at < now();
END;
$$;

-- Update triggers
CREATE TRIGGER update_scheduled_notifications_updated_at
  BEFORE UPDATE ON scheduled_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();