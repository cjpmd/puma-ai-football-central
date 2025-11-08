import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, teamId, eventId, gameFormat, gameDuration } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch squad players
    const { data: squadPlayers, error: squadError } = await supabase
      .from("players")
      .select("id, name, match_stats")
      .eq("team_id", teamId)
      .eq("status", "active");

    if (squadError) throw squadError;

    // Fetch historic position data from event_player_stats
    const playerIds = squadPlayers?.map((p) => p.id) || [];
    const { data: historicStats, error: statsError } = await supabase
      .from("event_player_stats")
      .select("player_id, position, minutes_played, is_captain")
      .in("player_id", playerIds)
      .order("created_at", { ascending: false })
      .limit(500);

    if (statsError) throw statsError;

    // Build context for AI
    const playersContext = squadPlayers?.map((player) => {
      const stats = player.match_stats as any;
      const historicPositions = historicStats
        ?.filter((s) => s.player_id === player.id)
        .map((s) => ({ position: s.position, minutes: s.minutes_played })) || [];

      return {
        id: player.id,
        name: player.name,
        totalGames: stats?.totalGames || 0,
        totalMinutes: stats?.totalMinutes || 0,
        captainGames: stats?.captainGames || 0,
        minutesByPosition: stats?.minutesByPosition || {},
        recentPositions: historicPositions.slice(0, 10),
      };
    }) || [];

    const systemPrompt = `You are an AI football coach assistant. Your job is to create line-ups and substitution plans.

Available Squad (${playersContext.length} players):
${JSON.stringify(playersContext, null, 2)}

Game Format: ${gameFormat}
Game Duration: ${gameDuration} minutes

Guidelines:
- Always use valid formations for ${gameFormat} (e.g., 4-3-3, 3-5-2, 4-4-2 for 11-a-side; 2-3-1, 1-3-1 for 7-a-side)
- Position players based on their historic positions when available
- Ensure fair playing time distribution unless instructed otherwise
- Use player IDs exactly as provided
- Create realistic substitution plans
- Return valid position names (Goalkeeper, Left Back, Centre Back, Right Back, Left Midfielder, Central Midfielder, Right Midfielder, Left Forward, Centre Forward, Right Forward)`;

    // Call Lovable AI with tool calling for structured output
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_team_selection",
              description: "Create a structured team selection with periods, formations, and player positions",
              parameters: {
                type: "object",
                properties: {
                  periods: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        periodNumber: { type: "number" },
                        formation: { type: "string" },
                        duration: { type: "number" },
                        positions: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              positionName: { type: "string" },
                              playerId: { type: "string" },
                            },
                            required: ["positionName", "playerId"],
                          },
                        },
                        substitutes: {
                          type: "array",
                          items: { type: "string" },
                        },
                        captainId: { type: "string" },
                      },
                      required: ["periodNumber", "formation", "duration", "positions"],
                    },
                  },
                  reasoning: { type: "string" },
                },
                required: ["periods", "reasoning"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_team_selection" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your Lovable workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error("AI Gateway error");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      throw new Error("AI did not return structured output");
    }

    const selectionData = JSON.parse(toolCall.function.arguments);

    console.log("AI generated selection:", selectionData);

    return new Response(JSON.stringify(selectionData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in ai-team-builder:", error);
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
