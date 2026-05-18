import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { imageBase64, mimeType } = await req.json();
    if (!imageBase64) throw new Error("No image provided");

    const anthropicKey = Deno.env.get("anthropic_api_key");
    if (!anthropicKey) throw new Error("anthropic_api_key not set");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mimeType || "image/jpeg",
                  data: imageBase64,
                },
              },
              {
                type: "text",
                text: `Identify this board game. Respond ONLY with a JSON object (no markdown, no explanation):
{
  "found": true,
  "confidence": 0.95,
  "game": {
    "title": "Game Name",
    "publisher": "Publisher Name or null",
    "release_year": 2020,
    "category": "strategy",
    "min_players": 2,
    "max_players": 4,
    "min_age": 10,
    "play_time": "60-90",
    "description": "Brief description",
    "estimated_price": 35
  }
}
If you cannot identify a board game, respond: {"found": false}`,
              },
            ],
          },
        ],
      }),
    });

    const aiData = await response.json();
    const text = aiData.content?.[0]?.text || "";
    
    try {
      const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      return new Response(JSON.stringify({ found: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
