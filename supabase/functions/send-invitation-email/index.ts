
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  email: string;
  name: string;
  invitationCode: string;
  role: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting send-invitation-email function");
    
    // Check for the Resend API key with the correct environment variable name
    const resendApiKey = Deno.env.get("puma_ai_api_key_Resend") || 
                        Deno.env.get("RESEND_API_KEY") || 
                        Deno.env.get("Onboarding") ||
                        Deno.env.get("Supabase_Integration");
    
    console.log("Available environment variables:", Object.keys(Deno.env.toObject()));
    
    if (!resendApiKey) {
      console.error("No Resend API key found in environment variables");
      throw new Error("Resend API key not configured. Please check Supabase secrets.");
    }

    console.log("Resend API key found, initializing Resend client");
    const resend = new Resend(resendApiKey);
    
    const { email, name, invitationCode, role }: InvitationEmailRequest = await req.json();
    console.log(`Sending invitation to ${email} for role ${role}`);

    const appUrl = Deno.env.get("APP_URL") || "https://pdarngodvrzehnpvdrii.supabase.co";
    const invitationUrl = `${appUrl}/auth?invitation=${invitationCode}`;

    const emailResponse = await resend.emails.send({
      from: "Puma AI <team@puma-ai.co.uk>",
      to: [email],
      subject: `You've been invited to join Puma AI as ${role}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">Welcome to Puma AI!</h1>
          <p>Hi ${name},</p>
          <p>You've been invited to join Puma AI as a <strong>${role}</strong>.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h3 style="margin-top: 0;">Your invitation code:</h3>
            <p style="font-size: 24px; font-weight: bold; color: #2563eb; margin: 10px 0; font-family: monospace;">${invitationCode}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Accept Invitation
            </a>
          </div>
          
          <p style="margin-top: 30px;">To accept your invitation:</p>
          <ol>
            <li>Click the "Accept Invitation" button above, or</li>
            <li>Go to the Puma AI login page and use your invitation code</li>
            <li>Create your account or log in if you already have one</li>
          </ol>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
            If you didn't expect this invitation, you can safely ignore this email.
            <br>
            This invitation will expire in 7 days.
          </p>
        </div>
      `,
    });

    console.log("Invitation email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: emailResponse.data?.id,
      email: email
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-invitation-email function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
