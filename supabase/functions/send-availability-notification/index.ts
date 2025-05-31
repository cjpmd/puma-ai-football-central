
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AvailabilityNotificationRequest {
  event_id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  role: string;
  event_title: string;
  event_date: string;
  event_time?: string;
  event_location?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    const {
      event_id,
      user_id,
      user_email,
      user_name,
      role,
      event_title,
      event_date,
      event_time,
      event_location
    }: AvailabilityNotificationRequest = await req.json();

    console.log("Sending availability notification to:", user_email);

    // Generate secure token for availability confirmation
    const token = crypto.randomUUID();
    const baseUrl = Deno.env.get("APP_URL") || "https://5d10e51a-8461-40f2-a899-60ebdbbef2fc.lovableproject.com";
    
    const availableUrl = `${baseUrl}/availability-confirm?token=${token}&status=available&event=${event_id}&user=${user_id}&role=${role}`;
    const unavailableUrl = `${baseUrl}/availability-confirm?token=${token}&status=unavailable&event=${event_id}&user=${user_id}&role=${role}`;

    // Store token for verification (you'd want to implement this)
    // await supabase.from('availability_tokens').insert({
    //   token,
    //   event_id,
    //   user_id,
    //   role,
    //   expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    // });

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333; text-align: center;">Availability Confirmation Required</h1>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #333; margin-top: 0;">${event_title}</h2>
          <p><strong>Date:</strong> ${event_date}</p>
          ${event_time ? `<p><strong>Time:</strong> ${event_time}</p>` : ''}
          ${event_location ? `<p><strong>Location:</strong> ${event_location}</p>` : ''}
          <p><strong>Your Role:</strong> ${role}</p>
        </div>

        <p>Hi ${user_name},</p>
        
        <p>You have been selected for the above event. Please confirm your availability by clicking one of the buttons below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${availableUrl}" style="background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 0 10px; display: inline-block;">
            ✅ I'm Available
          </a>
          <a href="${unavailableUrl}" style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 0 10px; display: inline-block;">
            ❌ I'm Unavailable
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          Please respond as soon as possible so the team can be finalized.
        </p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        
        <p style="color: #999; font-size: 12px; text-align: center;">
          This email was sent from your team management system. If you didn't expect this email, please contact your team manager.
        </p>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "Team Manager <noreply@puma-ai.com>",
      to: [user_email],
      subject: `Availability Required: ${event_title}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    // Log the notification
    await supabase.from('notification_logs').insert({
      user_id,
      event_id,
      notification_type: 'availability_request',
      method: 'email',
      status: 'sent',
      metadata: {
        email_id: emailResponse.data?.id,
        role,
        event_title
      }
    });

    return new Response(JSON.stringify({ success: true, email_id: emailResponse.data?.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-availability-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
