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

    const { data: players } = await supabase
      .from("players")
      .select("id, date_of_birth, status")
      .eq("status", "active");

    if (!players?.length) {
      return new Response(JSON.stringify({ updated: 0, total: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const cutoff28 = new Date(now.getTime() - 28 * 86400000).toISOString().split("T")[0];
    const cutoff7 = new Date(now.getTime() - 7 * 86400000).toISOString().split("T")[0];

    const { data: loads } = await supabase
      .from("training_load")
      .select("player_id, session_date, load_au, acwr_at_time")
      .gte("session_date", cutoff28);

    const { data: injuries } = await supabase
      .from("injury_record")
      .select("player_id, resolved_at")
      .is("resolved_at", null);

    const { data: maturation } = await supabase
      .from("maturation_record")
      .select("player_id, maturation_offset");

    const loadsMap = new Map<string, any[]>();
    (loads ?? []).forEach((l: any) => {
      if (!loadsMap.has(l.player_id)) loadsMap.set(l.player_id, []);
      loadsMap.get(l.player_id)!.push(l);
    });

    const injuredSet = new Set((injuries ?? []).map((i: any) => i.player_id));
    const matMap = new Map((maturation ?? []).map((m: any) => [m.player_id, m.maturation_offset]));

    let updated = 0;

    for (const player of players) {
      const playerLoads = loadsMap.get(player.id) ?? [];
      const loads7d = playerLoads.filter((l: any) => l.session_date >= cutoff7);
      const load7d = loads7d.reduce((s: number, l: any) => s + (l.load_au ?? 0), 0);

      const sortedLoads = [...playerLoads].sort((a: any, b: any) =>
        b.session_date.localeCompare(a.session_date)
      );
      const latestAcwr = sortedLoads[0]?.acwr_at_time ?? null;

      let availability_status: string;
      if (injuredSet.has(player.id)) {
        availability_status = "injured";
      } else if (latestAcwr && latestAcwr > 1.3) {
        availability_status = "at_risk";
      } else {
        availability_status = "available";
      }

      let overall_rating = 7;
      if (latestAcwr !== null) {
        if (latestAcwr >= 0.8 && latestAcwr <= 1.3) overall_rating = 8;
        else if (latestAcwr > 1.3 && latestAcwr <= 1.5) overall_rating = 6;
        else if (latestAcwr > 1.5) overall_rating = 4;
        else if (latestAcwr < 0.8) overall_rating = 5;
      }
      if (injuredSet.has(player.id)) overall_rating = Math.min(overall_rating, 3);

      const matOffset = matMap.get(player.id) ?? null;
      let maturation_badge: string | null = null;
      if (matOffset !== null) {
        if (matOffset <= -1) maturation_badge = "early";
        else if (matOffset >= 1) maturation_badge = "late";
        else maturation_badge = "average";
      }

      const summary = {
        availability_status,
        overall_rating,
        maturation_badge,
        load_7d: Math.round(load7d),
        acwr: latestAcwr,
        synced_at: now.toISOString(),
      };

      await supabase.from("players").update({ performance_summary: summary }).eq("id", player.id);
      updated++;
    }

    return new Response(JSON.stringify({ updated, total: players.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
