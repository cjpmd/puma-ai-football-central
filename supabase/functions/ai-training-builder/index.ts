import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DrillData {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  duration_minutes: number;
  tags: { name: string; color: string }[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, teamId, eventId, preferences } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch available drills from library
    const { data: drills } = await supabase
      .from('drills')
      .select(`
        id,
        name,
        description,
        difficulty,
        duration_minutes,
        drill_tags (
          tags (
            name,
            color
          )
        )
      `)
      .eq('team_id', teamId)
      .limit(50);

    const drillsContext: DrillData[] = (drills || []).map((drill: any) => ({
      id: drill.id,
      name: drill.name,
      description: drill.description || '',
      difficulty: drill.difficulty || 'medium',
      duration_minutes: drill.duration_minutes || 15,
      tags: (drill.drill_tags || []).map((dt: any) => ({
        name: dt.tags?.name || '',
        color: dt.tags?.color || ''
      }))
    }));

    // Fetch recent performance analysis if eventId provided or get recent events
    let performanceContext = '';
    if (eventId) {
      const { data: event } = await supabase
        .from('events')
        .select('scores')
        .eq('id', eventId)
        .single();
      
      if (event?.scores?.performanceAnalysis) {
        const analysis = event.scores.performanceAnalysis;
        performanceContext = `Recent Match Performance Analysis:
Positives (On-Ball): ${analysis.onBall?.positive?.join(', ') || 'None'}
Positives (Off-Ball): ${analysis.offBall?.positive?.join(', ') || 'None'}
Challenges (On-Ball): ${analysis.onBall?.challenging?.join(', ') || 'None'}
Challenges (Off-Ball): ${analysis.offBall?.challenging?.join(', ') || 'None'}`;
      }
    } else {
      // Get recent events for team
      const { data: recentEvents } = await supabase
        .from('events')
        .select('scores, date, opponent')
        .eq('team_id', teamId)
        .not('scores', 'is', null)
        .order('date', { ascending: false })
        .limit(3);

      if (recentEvents && recentEvents.length > 0) {
        const analyses = recentEvents
          .filter(e => e.scores?.performanceAnalysis)
          .map((e, i) => {
            const analysis = e.scores.performanceAnalysis;
            return `Match ${i + 1} (vs ${e.opponent || 'Unknown'}):
  Challenges: ${[...(analysis.onBall?.challenging || []), ...(analysis.offBall?.challenging || [])].join(', ') || 'None'}
  Positives: ${[...(analysis.onBall?.positive || []), ...(analysis.offBall?.positive || [])].join(', ') || 'None'}`;
          });
        performanceContext = `Recent Performance Trends:\n${analyses.join('\n\n')}`;
      }
    }

    const systemPrompt = `You are an expert football/soccer training coach creating data-driven training sessions.

${performanceContext ? performanceContext + '\n\n' : ''}Available Drills Library:
${drillsContext.map(d => `- ${d.name} (${d.difficulty}, ${d.duration_minutes}min): ${d.description}. Tags: ${d.tags.map(t => t.name).join(', ')}`).join('\n')}

Your task is to create a comprehensive training session that:
1. Addresses identified performance challenges
2. Builds on team strengths
3. Uses drills from the available library when possible
4. Suggests custom drills if library doesn't have what's needed
5. Provides appropriate duration for each drill
6. Creates a logical sequence/flow
7. Specifies equipment needs

Consider: warm-up, technical work, tactical drills, physical conditioning, cool-down.
Total session should be ${preferences?.duration || '60-90'} minutes.`;

    // Call Lovable AI with tool calling
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'create_training_session',
            description: 'Create a structured training session with drills',
            parameters: {
              type: 'object',
              properties: {
                sessionTitle: { type: 'string', description: 'Title for the training session' },
                drills: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      drillId: { type: 'string', description: 'ID from library or "custom" for new drill' },
                      name: { type: 'string', description: 'Drill name' },
                      description: { type: 'string', description: 'What the drill involves' },
                      duration: { type: 'number', description: 'Duration in minutes' },
                      tags: { 
                        type: 'array', 
                        items: { type: 'string' },
                        description: 'Categories like warm-up, technical, tactical, physical, cool-down'
                      },
                      notes: { type: 'string', description: 'Coaching points or setup details' }
                    },
                    required: ['name', 'duration', 'tags']
                  }
                },
                equipment: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      quantity: { type: 'number' }
                    }
                  }
                },
                reasoning: { type: 'string', description: 'Why this session addresses team needs' }
              },
              required: ['sessionTitle', 'drills', 'reasoning']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'create_training_session' } }
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API Error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service credits depleted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      console.error('No tool call in AI response:', aiData);
      return new Response(
        JSON.stringify({ error: 'Invalid AI response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const session = JSON.parse(toolCall.function.arguments);
    
    console.log('Generated training session:', session);

    return new Response(
      JSON.stringify(session),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-training-builder:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
