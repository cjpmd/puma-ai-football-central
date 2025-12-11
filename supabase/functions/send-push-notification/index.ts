
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  eventId?: string;
  title: string;
  body: string;
  userIds?: string[];
}

interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Send FCM notification
async function sendFCMNotification(
  pushToken: string, 
  title: string, 
  body: string, 
  eventId: string | undefined,
  fcmServerKey: string
): Promise<boolean> {
  const payload = {
    to: pushToken,
    notification: {
      title: title,
      body: body
    },
    data: {
      eventId: eventId || '',
      type: 'availability_request'
    }
  };

  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Authorization': `key=${fcmServerKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  return response.ok;
}

// Send Web Push notification
async function sendWebPushNotification(
  subscription: WebPushSubscription,
  title: string,
  body: string,
  eventId: string | undefined,
  vapidPrivateKey: string,
  vapidPublicKey: string
): Promise<boolean> {
  try {
    // Web Push requires the web-push library or manual implementation
    // For simplicity, we'll use the fetch API with proper headers
    
    const payload = JSON.stringify({
      title: title,
      body: body,
      icon: '/pwa-icons/icon-192x192.png',
      badge: '/pwa-icons/badge-72x72.png',
      data: {
        eventId: eventId || '',
        type: 'availability_request'
      }
    });

    // Create JWT for VAPID authentication
    const vapidHeaders = await createVapidHeaders(
      subscription.endpoint,
      vapidPublicKey,
      vapidPrivateKey
    );

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
        ...vapidHeaders
      },
      body: await encryptPayload(payload, subscription.keys.p256dh, subscription.keys.auth)
    });

    return response.ok;
  } catch (error) {
    console.error('Web Push error:', error);
    return false;
  }
}

// Simple VAPID header creation (simplified version)
async function createVapidHeaders(
  endpoint: string,
  publicKey: string,
  privateKey: string
): Promise<Record<string, string>> {
  // For a production implementation, use proper VAPID JWT creation
  // This is a simplified placeholder
  const audience = new URL(endpoint).origin;
  
  return {
    'Authorization': `vapid t=eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9, k=${publicKey}`
  };
}

// Placeholder for payload encryption (would need proper implementation)
async function encryptPayload(
  payload: string,
  p256dh: string,
  auth: string
): Promise<Uint8Array> {
  // In production, use proper Web Push encryption
  // For now, return the payload as bytes
  return new TextEncoder().encode(payload);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { eventId, title, body, userIds }: NotificationPayload = await req.json()

    let targetUserIds = userIds

    // If eventId provided and no specific users, get users from event
    if (eventId && (!targetUserIds || targetUserIds.length === 0)) {
      // Get event details
      const { data: event, error: eventError } = await supabaseClient
        .from('events')
        .select('*, teams!inner(*)')
        .eq('id', eventId)
        .single()

      if (eventError) {
        throw new Error(`Event not found: ${eventError.message}`)
      }

      // Get event selections to find players/staff
      const { data: selections } = await supabaseClient
        .from('event_selections')
        .select('player_positions, staff_selection')
        .eq('event_id', eventId)

      const allUserIds = new Set<string>()

      for (const selection of selections || []) {
        // Get player user IDs
        if (selection.player_positions) {
          const playerIds = selection.player_positions.map((p: any) => p.playerId || p.player_id).filter(Boolean)
          
          const { data: userPlayers } = await supabaseClient
            .from('user_players')
            .select('user_id')
            .in('player_id', playerIds)

          userPlayers?.forEach(up => allUserIds.add(up.user_id))
        }

        // Get staff user IDs
        if (selection.staff_selection) {
          const staffIds = selection.staff_selection.map((s: any) => s.staffId).filter(Boolean)
          
          const { data: userStaff } = await supabaseClient
            .from('user_staff')
            .select('user_id')
            .in('staff_id', staffIds)

          userStaff?.forEach(us => allUserIds.add(us.user_id))
        }
      }

      targetUserIds = Array.from(allUserIds)
    }

    if (!targetUserIds || targetUserIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No users to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get push tokens for target users
    const { data: profiles } = await supabaseClient
      .from('profiles')
      .select('id, push_token, name')
      .in('id', targetUserIds)
      .not('push_token', 'is', null)

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No push tokens found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get environment variables
    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY')
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')

    const notifications = profiles.map(async (profile) => {
      let success = false;
      let method = 'unknown';

      // Check if it's a Web Push subscription (prefixed with "webpush:")
      if (profile.push_token?.startsWith('webpush:')) {
        method = 'web_push';
        
        if (vapidPublicKey && vapidPrivateKey) {
          try {
            const subscriptionJson = profile.push_token.substring(8); // Remove "webpush:" prefix
            const subscription: WebPushSubscription = JSON.parse(subscriptionJson);
            
            success = await sendWebPushNotification(
              subscription,
              title,
              body,
              eventId,
              vapidPrivateKey,
              vapidPublicKey
            );
          } catch (e) {
            console.error('Failed to parse Web Push subscription:', e);
          }
        } else {
          console.log('VAPID keys not configured for Web Push');
        }
      } else if (profile.push_token && fcmServerKey) {
        // FCM notification (Capacitor/native)
        method = 'fcm';
        success = await sendFCMNotification(
          profile.push_token,
          title,
          body,
          eventId,
          fcmServerKey
        );
      }

      // Log notification attempt
      await supabaseClient
        .from('notification_logs')
        .insert({
          user_id: profile.id,
          event_id: eventId || null,
          title: title,
          body: body,
          notification_type: 'push',
          method: method,
          status: success ? 'sent' : 'failed'
        })

      return { userId: profile.id, success, method };
    })

    const results = await Promise.allSettled(notifications)
    const fulfilled = results.filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<any>[];
    const successCount = fulfilled.filter(r => r.value.success).length;

    console.log(`Push notifications sent: ${successCount}/${profiles.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount,
        total: profiles.length,
        results: fulfilled.map(r => r.value)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Error sending push notifications:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
