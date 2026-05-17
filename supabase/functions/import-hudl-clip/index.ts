import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const {
      player_id, academy_id, title, clip_url, hudl_clip_id,
      thumbnail_url, duration_seconds, tags, session_date,
      source = "hudl", metadata,
    } = body;

    if (!player_id || !title) {
      return new Response(JSON.stringify({ error: "player_id and title are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase.from("video_clip").insert({
      player_id,
      academy_id: academy_id ?? null,
      title,
      source,
      clip_url: clip_url ?? null,
      hudl_clip_id: hudl_clip_id ?? null,
      thumbnail_url: thumbnail_url ?? null,
      duration_seconds: duration_seconds ?? null,
      tags: tags ?? null,
      session_date: session_date ?? null,
      metadata: metadata ?? null,
    }).select("id").single();

    if (error) throw error;

    return new Response(JSON.stringify({ id: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
