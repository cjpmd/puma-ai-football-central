CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Fire the enhanced-notification-scheduler every 15 minutes to dispatch
-- any pending scheduled_notifications rows (morning reminders, 3-hour
-- reminders, weekly nudges) via send-push-notification (APNs + FCM + web push).
SELECT cron.schedule(
  'process-scheduled-notifications',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://pdarngodvrzehnpvdrii.supabase.co/functions/v1/enhanced-notification-scheduler',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"action":"process_scheduled_notifications"}'::jsonb
  );
  $$
);
