
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  eventId: string;
  title: string;
  body: string;
  userIds?: string[];
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

    // Get event details
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select('*, teams!inner(*)')
      .eq('id', eventId)
      .single()

    if (eventError) {
      throw new Error(`Event not found: ${eventError.message}`)
    }

    let targetUserIds = userIds

    // If no specific users provided, get all users linked to the event
    if (!targetUserIds || targetUserIds.length === 0) {
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

    if (targetUserIds.length === 0) {
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

    // Send push notifications using FCM (Firebase Cloud Messaging)
    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY')
    if (!fcmServerKey) {
      throw new Error('FCM_SERVER_KEY not configured')
    }

    const notifications = profiles.map(async (profile) => {
      const payload = {
        to: profile.push_token,
        notification: {
          title: title,
          body: body
        },
        data: {
          eventId: eventId,
          type: 'availability_request'
        }
      }

      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Authorization': `key=${fcmServerKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      // Log notification attempt
      await supabaseClient
        .from('notification_logs')
        .insert({
          user_id: profile.id,
          event_id: eventId,
          title: title,
          body: body,
          notification_type: 'availability_request',
          method: 'push',
          status: response.ok ? 'sent' : 'failed',
          metadata: {
            fcm_response: await response.text()
          }
        })

      return { userId: profile.id, success: response.ok }
    })

    const results = await Promise.allSettled(notifications)
    const successCount = results.filter(r => r.status === 'fulfilled').length

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount,
        total: profiles.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error sending push notifications:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
