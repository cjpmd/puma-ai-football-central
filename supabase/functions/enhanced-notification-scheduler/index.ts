import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

interface ScheduledNotification {
  id: string;
  event_id: string;
  notification_type: string;
  scheduled_time: string;
  target_users: string[];
  notification_data: NotificationPayload;
  status: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, data } = await req.json();

    switch (action) {
      case 'process_scheduled_notifications':
        return await processScheduledNotifications(supabaseClient);
      case 'send_manual_reminder':
        return await sendManualReminder(supabaseClient, data);
      case 'schedule_event_reminders':
        return await scheduleEventReminders(supabaseClient, data);
      case 'schedule_weekly_nudges':
        return await scheduleWeeklyNudges(supabaseClient);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    console.error('Error in enhanced-notification-scheduler:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Delegate to send-push-notification which handles APNs, FCM, and web push
async function callSendPushNotification(
  userIds: string[],
  title: string,
  body: string,
  eventId?: string
): Promise<{ sent: number; total: number }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title, body, userIds, eventId }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`send-push-notification failed (${response.status}): ${text}`);
  }

  return await response.json();
}

async function processScheduledNotifications(supabaseClient: any) {
  console.log('Processing scheduled notifications...');

  const { data: notifications, error } = await supabaseClient
    .from('scheduled_notifications')
    .select('*, events(id, title, event_type, date, start_time, location, team_id)')
    .eq('status', 'pending')
    .lte('scheduled_time', new Date().toISOString())
    .order('scheduled_time', { ascending: true });

  if (error) throw new Error(`Failed to fetch scheduled notifications: ${error.message}`);

  let processed = 0;
  let failed = 0;

  for (const notification of notifications) {
    try {
      await sendScheduledNotification(supabaseClient, notification);

      await supabaseClient
        .from('scheduled_notifications')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', notification.id);

      processed++;
    } catch (error) {
      console.error(`Failed to send notification ${notification.id}:`, error);

      await supabaseClient
        .from('scheduled_notifications')
        .update({ status: 'failed' })
        .eq('id', notification.id);

      failed++;
    }
  }

  return new Response(
    JSON.stringify({ success: true, processed, failed }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function sendScheduledNotification(supabaseClient: any, notification: ScheduledNotification) {
  const eventData = notification.notification_data;

  // Fetch preferences to filter users who have opted out of this notification type
  const { data: users, error: usersError } = await supabaseClient
    .from('profiles')
    .select('id, notification_preferences')
    .in('id', notification.target_users);

  if (usersError) throw new Error(`Failed to fetch user preferences: ${usersError.message}`);

  const filteredUserIds: string[] = (users ?? [])
    .filter((u: any) => shouldSendNotification(notification.notification_type, u.notification_preferences ?? {}))
    .map((u: any) => u.id);

  if (filteredUserIds.length === 0) {
    console.log(`All users opted out for notification ${notification.id}`);
    return;
  }

  console.log(`Sending ${notification.notification_type} to ${filteredUserIds.length} users for event ${notification.event_id}`);

  // Delegate delivery to send-push-notification (handles APNs + FCM + web push)
  await callSendPushNotification(filteredUserIds, eventData.title, eventData.body, notification.event_id);
}

async function sendManualReminder(supabaseClient: any, data: any) {
  const { eventId, selectedUserIds, message, title } = data;

  const { data: event, error: eventError } = await supabaseClient
    .from('events')
    .select('title, event_type')
    .eq('id', eventId)
    .single();

  if (eventError) throw new Error(`Event not found: ${eventError.message}`);

  const notifTitle = title || `Reminder: ${event.title}`;

  console.log(`Sending manual reminder to ${selectedUserIds.length} users for event ${eventId}`);

  const result = await callSendPushNotification(selectedUserIds, notifTitle, message, eventId);

  return new Response(
    JSON.stringify({
      success: true,
      sent: result.sent,
      failed: result.total - result.sent,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Schedule 3-hour and morning reminders when an event is created/updated
async function scheduleEventReminders(supabaseClient: any, data: any) {
  const { eventId } = data;

  const { data: event, error: eventError } = await supabaseClient
    .from('events')
    .select('id, title, date, start_time, event_type')
    .eq('id', eventId)
    .single();

  if (eventError) throw new Error(`Event not found: ${eventError.message}`);

  // Get all invited users (pending or accepted)
  const { data: availability, error: availError } = await supabaseClient
    .from('event_availability')
    .select('user_id')
    .eq('event_id', eventId)
    .not('user_id', 'is', null);

  if (availError) throw new Error(`Failed to fetch availability: ${availError.message}`);

  const targetUsers = [...new Set((availability ?? []).map((a: any) => a.user_id as string))];

  if (targetUsers.length === 0) return new Response(
    JSON.stringify({ success: true, scheduled: 0 }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );

  const eventDate = new Date(`${event.date}T${event.start_time ?? '09:00'}:00`);
  const reminders = [];

  // Morning reminder at 9 AM on event day (if event is later that day)
  const morningReminder = new Date(eventDate);
  morningReminder.setHours(9, 0, 0, 0);
  if (morningReminder > new Date() && morningReminder < eventDate) {
    reminders.push({
      event_id: eventId,
      notification_type: 'morning_reminder',
      scheduled_time: morningReminder.toISOString(),
      target_users: targetUsers,
      status: 'pending',
      notification_data: {
        title: event.event_type === 'match' ? 'Match Day!' : 'Training Today',
        body: `${event.title} is today. Don't forget to confirm your attendance!`,
      },
    });
  }

  // 3-hour reminder
  const threeHourReminder = new Date(eventDate.getTime() - 3 * 60 * 60 * 1000);
  if (threeHourReminder > new Date()) {
    reminders.push({
      event_id: eventId,
      notification_type: '3_hour_reminder',
      scheduled_time: threeHourReminder.toISOString(),
      target_users: targetUsers,
      status: 'pending',
      notification_data: {
        title: event.event_type === 'match' ? 'Match in 3 Hours' : 'Training in 3 Hours',
        body: `${event.title} starts in 3 hours.`,
      },
    });
  }

  if (reminders.length > 0) {
    // Remove any existing pending reminders for this event to avoid duplicates
    await supabaseClient
      .from('scheduled_notifications')
      .delete()
      .eq('event_id', eventId)
      .eq('status', 'pending')
      .in('notification_type', ['morning_reminder', '3_hour_reminder']);

    const { error: insertError } = await supabaseClient
      .from('scheduled_notifications')
      .insert(reminders);

    if (insertError) throw new Error(`Failed to schedule reminders: ${insertError.message}`);
  }

  return new Response(
    JSON.stringify({ success: true, scheduled: reminders.length }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function scheduleWeeklyNudges(supabaseClient: any) {
  console.log('Scheduling weekly nudges...');

  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data: events, error } = await supabaseClient
    .from('events')
    .select('id, title, date, event_type')
    .gte('date', now.toISOString().split('T')[0])
    .lte('date', nextWeek.toISOString().split('T')[0]);

  if (error) throw new Error(`Failed to fetch upcoming events: ${error.message}`);

  let scheduled = 0;

  for (const event of events) {
    const { data: pendingUsers, error: pendingError } = await supabaseClient
      .from('event_availability')
      .select('user_id')
      .eq('event_id', event.id)
      .eq('status', 'pending')
      .not('user_id', 'is', null);

    if (pendingError) {
      console.error(`Failed to fetch pending RSVPs for event ${event.id}:`, pendingError);
      continue;
    }

    if (pendingUsers.length > 0) {
      const nudgeTime = getNextNudgeTime();

      const { error: insertError } = await supabaseClient
        .from('scheduled_notifications')
        .insert({
          event_id: event.id,
          notification_type: 'weekly_nudge',
          scheduled_time: nudgeTime,
          target_users: pendingUsers.map((u: any) => u.user_id),
          status: 'pending',
          notification_data: {
            title: 'RSVP Reminder',
            body: `Please confirm your attendance for ${event.title} on ${new Date(event.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`,
          },
        });

      if (!insertError) scheduled++;
    }
  }

  return new Response(
    JSON.stringify({ success: true, scheduled }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function shouldSendNotification(type: string, preferences: any): boolean {
  const prefs = {
    event_reminders: true,
    availability_requests: true,
    manual_reminders: true,
    weekly_nudges: true,
    ...preferences,
  };

  switch (type) {
    case '3_hour_reminder':
    case 'morning_reminder':
      return prefs.event_reminders;
    case 'weekly_nudge':
      return prefs.weekly_nudges;
    case 'manual_reminder':
      return prefs.manual_reminders;
    default:
      return true;
  }
}

function getNextNudgeTime(): string {
  const now = new Date();
  const currentDay = now.getDay();

  let daysUntilTarget: number;
  if (currentDay < 3) {
    daysUntilTarget = 3 - currentDay;       // next Wednesday
  } else if (currentDay < 5) {
    daysUntilTarget = 5 - currentDay;       // next Friday
  } else {
    daysUntilTarget = 7 - currentDay;       // next Sunday
  }

  const nudgeDate = new Date(now.getTime() + daysUntilTarget * 24 * 60 * 60 * 1000);
  nudgeDate.setHours(19, 0, 0, 0);
  return nudgeDate.toISOString();
}
