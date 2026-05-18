import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { barcode } = await req.json();
    if (!barcode) throw new Error("No barcode provided");

    // Try Open Library / UPC lookup
    const upcRes = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`);
    
    if (upcRes.ok) {
      const upcData = await upcRes.json();
      const item = upcData.items?.[0];
      if (item) {
        return new Response(JSON.stringify({
          found: true,
          confidence: 0.85,
          game: {
            title: item.title,
            description: item.description || null,
            category: "other",
            estimated_price: item.lowest_recorded_price || null,
          }
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Fallback: use Claude AI to identify from barcode
    const anthropicKey = Deno.env.get("anthropic_api_key");
    if (anthropicKey) {
      const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 512,
          messages: [{
            role: "user",
            content: `Is barcode ${barcode} a known board game? If yes, respond with JSON only:
{"found":true,"confidence":0.7,"game":{"title":"Name","publisher":"Pub","release_year":2020,"category":"strategy","min_players":2,"max_players":4,"min_age":10,"play_time":"60","description":"desc","estimated_price":30}}
If not known, respond: {"found":false}`
          }]
        })
      });
      const aiData = await aiRes.json();
      const text = aiData.content?.[0]?.text || "";
      try {
        const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());
        return new Response(JSON.stringify(parsed), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch {}
    }

    return new Response(JSON.stringify({ found: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
