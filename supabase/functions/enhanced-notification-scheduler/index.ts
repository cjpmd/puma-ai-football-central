import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  category?: string;
  actions?: Array<{
    id: string;
    title: string;
    action: string;
  }>;
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

async function processScheduledNotifications(supabaseClient: any) {
  console.log('Processing scheduled notifications...');
  
  // Get notifications ready to be sent
  const { data: notifications, error } = await supabaseClient
    .from('scheduled_notifications')
    .select(`
      *,
      events (
        id, title, event_type, date, start_time, location, team_id
      )
    `)
    .eq('status', 'pending')
    .lte('scheduled_time', new Date().toISOString())
    .order('scheduled_time', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch scheduled notifications: ${error.message}`);
  }

  let processed = 0;
  let failed = 0;

  for (const notification of notifications) {
    try {
      await sendScheduledNotification(supabaseClient, notification);
      
      // Mark as sent
      await supabaseClient
        .from('scheduled_notifications')
        .update({ 
          status: 'sent', 
          sent_at: new Date().toISOString() 
        })
        .eq('id', notification.id);
      
      processed++;
    } catch (error) {
      console.error(`Failed to send notification ${notification.id}:`, error);
      
      // Mark as failed
      await supabaseClient
        .from('scheduled_notifications')
        .update({ status: 'failed' })
        .eq('id', notification.id);
      
      failed++;
    }
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      processed, 
      failed,
      message: `Processed ${processed} notifications, ${failed} failed`
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function sendScheduledNotification(supabaseClient: any, notification: ScheduledNotification) {
  // Get event data - removed the invalid property access
  const eventData = notification.notification_data;
  
  // Generate secure deep link token
  const token = await generateSecureToken(supabaseClient, notification.event_id);
  
  // Get user push tokens
  const { data: users, error: usersError } = await supabaseClient
    .from('profiles')
    .select('id, push_token, notification_preferences')
    .in('id', notification.target_users)
    .not('push_token', 'is', null);

  if (usersError) {
    throw new Error(`Failed to fetch user tokens: ${usersError.message}`);
  }

  // Filter users based on notification preferences
  const targetUsers = users.filter((user: any) => {
    const prefs = user.notification_preferences || {};
    return shouldSendNotification(notification.notification_type, prefs);
  });

  // Prepare notification payload with deep linking and actions
  const payload = {
    title: eventData.title,
    body: eventData.body,
    data: {
      eventId: notification.event_id,
      type: notification.notification_type,
      deepLink: `puma://event/${notification.event_id}?token=${token}`,
      ...eventData.data
    },
    android: {
      channelId: getAndroidChannel(notification.notification_type),
      actions: getQuickActions(notification.notification_type, token)
    },
    apns: {
      payload: {
        aps: {
          category: getIOSCategory(notification.notification_type),
          'thread-id': `event-${notification.event_id}`
        }
      }
    }
  };

  // Send notifications via FCM
  for (const user of targetUsers) {
    try {
      await sendPushNotification(user.push_token, payload);
      
      // Log notification
      await supabaseClient
        .from('notification_logs')
        .insert({
          user_id: user.id,
          title: payload.title,
          body: payload.body,
          type: notification.notification_type,
          status: 'sent',
          metadata: {
            event_id: notification.event_id,
            scheduled_notification_id: notification.id
          },
          deep_link_token: token,
          notification_category: getNotificationCategory(notification.notification_type),
          quick_actions: payload.android.actions
        });
        
    } catch (error: unknown) {
      console.error(`Failed to send to user ${user.id}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Log failed notification
      await supabaseClient
        .from('notification_logs')
        .insert({
          user_id: user.id,
          title: payload.title,
          body: payload.body,
          type: notification.notification_type,
          status: 'failed',
          metadata: {
            event_id: notification.event_id,
            error: errorMessage
          }
        });
    }
  }
}

async function sendManualReminder(supabaseClient: any, data: any) {
  const { eventId, selectedUserIds, message, title } = data;
  
  // Get event details
  const { data: event, error: eventError } = await supabaseClient
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (eventError) {
    throw new Error(`Event not found: ${eventError.message}`);
  }

  // Generate secure token
  const token = await generateSecureToken(supabaseClient, eventId);
  
  // Get user push tokens
  const { data: users, error: usersError } = await supabaseClient
    .from('profiles')
    .select('id, push_token')
    .in('id', selectedUserIds)
    .not('push_token', 'is', null);

  if (usersError) {
    throw new Error(`Failed to fetch user tokens: ${usersError.message}`);
  }

  const payload = {
    title: title || `Manual Reminder: ${event.title}`,
    body: message,
    data: {
      eventId,
      type: 'manual_reminder',
      deepLink: `puma://event/${eventId}?token=${token}`
    },
    android: {
      channelId: getAndroidChannel(event.event_type)
    },
    apns: {
      payload: {
        aps: {
          category: 'MANUAL_REMINDER',
          'thread-id': `event-${eventId}`
        }
      }
    }
  };

  let sent = 0;
  let failed = 0;

  for (const user of users) {
    try {
      await sendPushNotification(user.push_token, payload);
      sent++;
      
      // Log notification
      await supabaseClient
        .from('notification_logs')
        .insert({
          user_id: user.id,
          title: payload.title,
          body: payload.body,
          type: 'manual_reminder',
          status: 'sent',
          metadata: { event_id: eventId },
          deep_link_token: token
        });
        
    } catch (error) {
      console.error(`Failed to send manual reminder to user ${user.id}:`, error);
      failed++;
    }
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      sent, 
      failed,
      message: `Manual reminder sent to ${sent} users, ${failed} failed`
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function scheduleWeeklyNudges(supabaseClient: any) {
  console.log('Scheduling weekly nudges...');
  
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  // Get events in the next 7 days that need RSVP nudges
  const { data: events, error } = await supabaseClient
    .from('events')
    .select('*')
    .gte('date', now.toISOString().split('T')[0])
    .lte('date', nextWeek.toISOString().split('T')[0]);

  if (error) {
    throw new Error(`Failed to fetch upcoming events: ${error.message}`);
  }

  let scheduled = 0;

  for (const event of events) {
    // Get users who haven't RSVPed
    const { data: pendingUsers, error: pendingError } = await supabaseClient
      .from('event_availability')
      .select('user_id')
      .eq('event_id', event.id)
      .eq('status', 'pending');

    if (pendingError) {
      console.error(`Failed to fetch pending RSVPs for event ${event.id}:`, pendingError);
      continue;
    }

    if (pendingUsers.length > 0) {
      const nudgeTime = getNextNudgeTime(); // Sunday, Wednesday, or Friday evening
      
      await supabaseClient
        .from('scheduled_notifications')
        .insert({
          event_id: event.id,
          notification_type: 'weekly_nudge',
          scheduled_time: nudgeTime,
          target_users: pendingUsers.map((u: any) => u.user_id),
          notification_data: {
            title: 'RSVP Reminder',
            body: `Please confirm your attendance for ${event.title} on ${event.date}`,
            event_type: event.event_type
          }
        });
      
      scheduled++;
    }
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      scheduled,
      message: `Scheduled ${scheduled} weekly nudge notifications`
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function generateSecureToken(supabaseClient: any, eventId: string): Promise<string> {
  const { data, error } = await supabaseClient
    .rpc('generate_secure_notification_token');

  if (error) {
    throw new Error(`Failed to generate token: ${error.message}`);
  }

  return data;
}

async function sendPushNotification(token: string, payload: any) {
  const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');
  if (!fcmServerKey) {
    throw new Error('FCM_SERVER_KEY not configured');
  }

  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Authorization': `key=${fcmServerKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data,
      android: payload.android,
      apns: payload.apns
    }),
  });

  if (!response.ok) {
    throw new Error(`FCM request failed: ${response.statusText}`);
  }

  return await response.json();
}

function shouldSendNotification(type: string, preferences: any): boolean {
  const defaultPrefs = {
    event_reminders: true,
    availability_requests: true,
    manual_reminders: true,
    weekly_nudges: true
  };
  
  const prefs = { ...defaultPrefs, ...preferences };
  
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

function getAndroidChannel(eventType: string): string {
  switch (eventType) {
    case 'match':
      return 'matchday';
    case 'training':
      return 'training';
    default:
      return 'general';
  }
}

function getIOSCategory(notificationType: string): string {
  switch (notificationType) {
    case '3_hour_reminder':
    case 'morning_reminder':
      return 'EVENT_REMINDER';
    case 'weekly_nudge':
      return 'RSVP_REQUEST';
    case 'manual_reminder':
      return 'MANUAL_REMINDER';
    default:
      return 'GENERAL';
  }
}

function getNotificationCategory(type: string): string {
  switch (type) {
    case '3_hour_reminder':
    case 'morning_reminder':
      return 'event_reminder';
    case 'weekly_nudge':
      return 'rsvp_nudge';
    case 'manual_reminder':
      return 'manual_reminder';
    default:
      return 'general';
  }
}

function getQuickActions(notificationType: string, token: string) {
  if (notificationType === 'weekly_nudge' || notificationType === 'morning_reminder') {
    return [
      {
        id: 'accept',
        title: 'Accept',
        action: `puma://rsvp/yes?token=${token}`
      },
      {
        id: 'decline', 
        title: 'Decline',
        action: `puma://rsvp/no?token=${token}`
      }
    ];
  }
  return [];
}

function getNextNudgeTime(): string {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  let targetDay: number;
  
  // Determine next nudge day (Sunday = 0, Wednesday = 3, Friday = 5)
  if (currentDay < 3) {
    targetDay = 3; // Next Wednesday
  } else if (currentDay < 5) {
    targetDay = 5; // Next Friday  
  } else {
    targetDay = 0; // Next Sunday
  }
  
  const daysUntilTarget = targetDay === 0 ? (7 - currentDay) : (targetDay - currentDay);
  const nudgeDate = new Date(now.getTime() + daysUntilTarget * 24 * 60 * 60 * 1000);
  
  // Set to 7 PM
  nudgeDate.setHours(19, 0, 0, 0);
  
  return nudgeDate.toISOString();
}