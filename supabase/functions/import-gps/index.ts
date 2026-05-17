import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COL_MAP: Record<string, string> = {
  total_distance: "distance_m",
  distance: "distance_m",
  total_distance_m_: "distance_m",
  hsr_distance: "hsr_distance_m",
  hi_distance: "hsr_distance_m",
  high_intensity_running_distance: "hsr_distance_m",
  sprint_distance: "sprint_distance_m",
  max_speed: "max_speed_kmh",
  max_velocity: "max_speed_kmh",
  maximum_speed: "max_speed_kmh",
  player_load: "player_load",
  player_load_accum_: "player_load",
  accelerations: "accel_count",
  explosive_movements: "accel_count",
  accel_decel: "accel_count",
};

function normalizeKey(k: string): string {
  return k.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const source = (formData.get("source") as string) ?? "other";
    const sessionDate = formData.get("session_date") as string | null;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = await file.text();
    const lines = text.split("\n").filter(l => l.trim());
    if (lines.length < 2) {
      return new Response(JSON.stringify({ error: "CSV too short" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawHeaders = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
    const headers = rawHeaders.map(normalizeKey);

    const { data: players } = await supabase.from("players").select("id, name");
    const playerMap = new Map<string, string>();
    (players ?? []).forEach((p: any) => {
      playerMap.set(p.name.toLowerCase().trim(), p.id);
    });

    let inserted = 0, skipped = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = vals[idx] ?? ""; });

      const playerName = row["player_name"] ?? row["name"] ?? row["athlete"] ?? row["player"] ?? "";
      if (!playerName) { skipped++; continue; }
      const playerId = playerMap.get(playerName.toLowerCase().trim());
      if (!playerId) { errors.push(`Player not found: ${playerName}`); skipped++; continue; }

      const date = sessionDate ?? row["date"] ?? row["session_date"] ?? "";
      if (!date) { errors.push(`No date for row ${i}`); skipped++; continue; }

      const gpsData: Record<string, number | string | null> = {};
      for (const [raw, mapped] of Object.entries(COL_MAP)) {
        const val = row[raw];
        if (val !== undefined && val !== "") {
          const num = parseFloat(val);
          if (!isNaN(num)) gpsData[mapped] = mapped === "accel_count" ? Math.round(num) : num;
        }
      }
      gpsData.gps_source = source;
      gpsData.gps_imported_at = new Date().toISOString();

      const { data: existing } = await supabase
        .from("training_load")
        .select("id")
        .eq("player_id", playerId)
        .eq("session_date", date)
        .maybeSingle();

      if (existing) {
        await supabase.from("training_load").update(gpsData).eq("id", existing.id);
      } else {
        await supabase.from("training_load").insert({ player_id: playerId, session_date: date, ...gpsData });
      }
      inserted++;
    }

    return new Response(JSON.stringify({ inserted, skipped, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
