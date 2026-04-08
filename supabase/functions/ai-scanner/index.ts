import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, mimeType } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a board game identification expert. Analyze the image and identify the board game shown. Return ONLY a JSON object with these fields:
- title: the exact game name
- publisher: the publisher name if visible
- year: release year if known
- category: game category (Strategy, Family, Party, etc.)
- min_players: minimum players
- max_players: maximum players
- min_age: minimum age
- play_time: play time in minutes
- confidence: your confidence level from 0.0 to 1.0
- description: a brief 1-2 sentence description of the game

If you cannot identify the game, return {"title": null, "confidence": 0}. Return ONLY valid JSON, no markdown.`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Identify this board game from the image:" },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType || "image/jpeg"};base64,${imageBase64}` }
              }
            ]
          }
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please retry" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    
    // Parse AI response - strip markdown fences if present
    let cleaned = content.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    
    let gameInfo;
    try {
      gameInfo = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ found: false, error: "Could not parse AI response" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!gameInfo.title || gameInfo.confidence < 0.3) {
      return new Response(JSON.stringify({ found: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try to find in master_games for enrichment
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.49.1");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: masterGame } = await supabase
      .from("master_games")
      .select("*")
      .ilike("title", `%${gameInfo.title}%`)
      .limit(1)
      .maybeSingle();

    const game = masterGame ? {
      id: masterGame.id,
      title: masterGame.title,
      publisher: masterGame.publisher || gameInfo.publisher,
      year: masterGame.release_year || gameInfo.year,
      cover_image_url: masterGame.cover_image_url,
      description: masterGame.description || gameInfo.description,
      category: masterGame.category || gameInfo.category,
      min_players: masterGame.min_players || gameInfo.min_players,
      max_players: masterGame.max_players || gameInfo.max_players,
      min_age: masterGame.min_age || gameInfo.min_age,
      play_time: masterGame.play_time || gameInfo.play_time,
    } : {
      title: gameInfo.title,
      publisher: gameInfo.publisher,
      year: gameInfo.year,
      description: gameInfo.description,
      category: gameInfo.category,
      min_players: gameInfo.min_players,
      max_players: gameInfo.max_players,
      min_age: gameInfo.min_age,
      play_time: gameInfo.play_time,
    };

    return new Response(JSON.stringify({
      found: true,
      source: masterGame ? "database+ai" : "ai",
      confidence: gameInfo.confidence,
      game,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("ai-scanner error:", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
