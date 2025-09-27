import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { token, action, userId, eventId } = await req.json();

    // Validate the secure token
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('secure_notification_tokens')
      .select('*')
      .eq('token', token)
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .gt('expires_at', new Date().toISOString())
      .is('used_at', null)
      .single();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark token as used
    await supabaseClient
      .from('secure_notification_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenData.id);

    let status: string;
    let response_message: string;

    switch (action) {
      case 'accept':
      case 'yes':
        status = 'yes';
        response_message = 'You have confirmed your attendance';
        break;
      case 'decline':
      case 'no':
        status = 'no';
        response_message = 'You have declined attendance';
        break;
      case 'maybe':
        status = 'maybe';
        response_message = 'You have marked yourself as maybe attending';
        break;
      default:
        throw new Error('Invalid action');
    }

    // Get user roles for this event
    const { data: userRoles, error: rolesError } = await supabaseClient
      .rpc('get_user_event_roles', {
        p_event_id: eventId,
        p_user_id: userId
      });

    if (rolesError) {
      throw new Error(`Failed to get user roles: ${rolesError.message}`);
    }

    if (!userRoles || userRoles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'User not associated with this event' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update availability for each role
    for (const roleData of userRoles) {
      const { data: existingAvailability } = await supabaseClient
        .from('event_availability')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .eq('role', roleData.role)
        .single();

      const availabilityData = {
        event_id: eventId,
        user_id: userId,
        role: roleData.role,
        status,
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (existingAvailability) {
        // Update existing
        await supabaseClient
          .from('event_availability')
          .update(availabilityData)
          .eq('id', existingAvailability.id);
      } else {
        // Create new
        await supabaseClient
          .from('event_availability')
          .insert(availabilityData);
      }
    }

    // Log the RSVP response
    await supabaseClient
      .from('notification_logs')
      .insert({
        user_id: userId,
        title: 'RSVP Response',
        body: `User responded ${status} to event`,
        type: 'rsvp_response',
        status: 'delivered',
        metadata: {
          event_id: eventId,
          action: action,
          response: status,
          token_used: token
        }
      });

    // Send confirmation notification back to user
    await sendConfirmationNotification(supabaseClient, userId, eventId, status, response_message);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: response_message,
        status: status
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in notification-rsvp-handler:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function sendConfirmationNotification(
  supabaseClient: any, 
  userId: string, 
  eventId: string, 
  status: string, 
  message: string
) {
  try {
    // Get user's push token
    const { data: user, error: userError } = await supabaseClient
      .from('profiles')
      .select('push_token')
      .eq('id', userId)
      .single();

    if (userError || !user?.push_token) {
      console.log('No push token found for user:', userId);
      return;
    }

    // Get event details
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select('title, date')
      .eq('id', eventId)
      .single();

    if (eventError) {
      console.error('Failed to get event details:', eventError);
      return;
    }

    const payload = {
      title: 'RSVP Confirmed',
      body: `${message} for ${event.title}`,
      data: {
        eventId,
        type: 'rsvp_confirmation',
        status
      }
    };

    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');
    if (!fcmServerKey) {
      console.error('FCM_SERVER_KEY not configured');
      return;
    }

    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${fcmServerKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: user.push_token,
        notification: payload,
        data: payload.data
      }),
    });

    if (!response.ok) {
      console.error('Failed to send confirmation notification:', response.statusText);
    }

  } catch (error) {
    console.error('Error sending confirmation notification:', error);
  }
}