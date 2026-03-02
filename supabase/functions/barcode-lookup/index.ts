import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) throw new Error("Not authenticated");

    const { barcode } = await req.json();
    if (!barcode || typeof barcode !== "string" || barcode.length < 8) {
      throw new Error("Invalid barcode");
    }

    // 1. Check internal DB first
    const { data: cached } = await supabaseAdmin
      .from("barcode_catalog")
      .select("*")
      .eq("barcode", barcode)
      .maybeSingle();

    if (cached) {
      return new Response(JSON.stringify({ found: true, source: "internal", game: cached }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Search BoardGameGeek XML API by barcode (UPC search)
    // BGG doesn't support direct barcode search, so we'll try the BGG search API
    // First try exact barcode match via BGG API2
    let bggGame = null;

    try {
      // Search BGG by barcode using their search
      const searchUrl = `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(barcode)}&type=boardgame`;
      const searchRes = await fetch(searchUrl);
      const searchXml = await searchRes.text();

      // Parse XML to find game ID
      const idMatch = searchXml.match(/id="(\d+)"/);
      if (idMatch) {
        const bggId = idMatch[1];
        // Get full game details
        const detailUrl = `https://boardgamegeek.com/xmlapi2/thing?id=${bggId}&stats=1`;
        const detailRes = await fetch(detailUrl);
        const detailXml = await detailRes.text();

        const name = detailXml.match(/<name type="primary" sortindex="\d+" value="([^"]+)"/)?.[1];
        const image = detailXml.match(/<image>([^<]+)<\/image>/)?.[1];
        const description = detailXml.match(/<description>([^<]*)<\/description>/)?.[1];
        const yearPublished = detailXml.match(/yearpublished value="(\d+)"/)?.[1];
        const minPlayers = detailXml.match(/minplayers value="(\d+)"/)?.[1];
        const maxPlayers = detailXml.match(/maxplayers value="(\d+)"/)?.[1];
        const minAge = detailXml.match(/minage value="(\d+)"/)?.[1];
        const playTime = detailXml.match(/playingtime value="(\d+)"/)?.[1];
        const publisher = detailXml.match(/<link type="boardgamepublisher"[^>]*value="([^"]+)"/)?.[1];

        if (name) {
          bggGame = {
            barcode,
            name,
            publisher: publisher || null,
            year: yearPublished ? parseInt(yearPublished) : null,
            image_url: image || null,
            description: description ? description.substring(0, 500).replace(/&#10;/g, "\n").replace(/&amp;/g, "&") : null,
            category: null,
            min_players: minPlayers ? parseInt(minPlayers) : null,
            max_players: maxPlayers ? parseInt(maxPlayers) : null,
            min_age: minAge ? parseInt(minAge) : null,
            play_time: playTime || null,
            bgg_id: bggId,
          };
        }
      }
    } catch (bggError) {
      console.error("BGG lookup failed:", bggError);
    }

    if (bggGame) {
      // Save to catalog for future lookups
      await supabaseAdmin.from("barcode_catalog").insert(bggGame);

      return new Response(JSON.stringify({ found: true, source: "bgg", game: bggGame }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ found: false, barcode }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
