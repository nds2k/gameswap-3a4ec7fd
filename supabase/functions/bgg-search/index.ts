import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

async function fetchBGGGameDetails(bggId: string): Promise<any | null> {
  try {
    const detailUrl = `https://boardgamegeek.com/xmlapi2/thing?id=${bggId}&stats=1`;
    const detailRes = await fetch(detailUrl, { signal: AbortSignal.timeout(10000) });
    const detailXml = await detailRes.text();

    const name = detailXml.match(/<name type="primary" sortindex="\d+" value="([^"]+)"/)?.[1];
    if (!name) return null;

    const image = detailXml.match(/<image>([^<]+)<\/image>/)?.[1];
    const thumbnail = detailXml.match(/<thumbnail>([^<]+)<\/thumbnail>/)?.[1];
    const description = detailXml.match(/<description>([^<]*)<\/description>/)?.[1];
    const yearPublished = detailXml.match(/yearpublished value="(\d+)"/)?.[1];
    const minPlayers = detailXml.match(/minplayers value="(\d+)"/)?.[1];
    const maxPlayers = detailXml.match(/maxplayers value="(\d+)"/)?.[1];
    const minAge = detailXml.match(/minage value="(\d+)"/)?.[1];
    const playTime = detailXml.match(/playingtime value="(\d+)"/)?.[1];
    const publisher = detailXml.match(/<link type="boardgamepublisher"[^>]*value="([^"]+)"/)?.[1];
    const category = detailXml.match(/<link type="boardgamecategory"[^>]*value="([^"]+)"/)?.[1];
    const rating = detailXml.match(/<average value="([^"]+)"/)?.[1];
    const numRatings = detailXml.match(/<usersrated value="(\d+)"/)?.[1];

    return {
      bgg_id: bggId,
      title: name,
      normalized_title: normalizeTitle(name),
      publisher: publisher || null,
      category: category || null,
      release_year: yearPublished ? parseInt(yearPublished) : null,
      cover_image_url: image || thumbnail || null,
      description: description
        ? description.substring(0, 1000).replace(/&#10;/g, "\n").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
        : null,
      min_players: minPlayers ? parseInt(minPlayers) : null,
      max_players: maxPlayers ? parseInt(maxPlayers) : null,
      min_age: minAge ? parseInt(minAge) : null,
      play_time: playTime || null,
      rating: rating ? parseFloat(rating) : null,
      num_ratings: numRatings ? parseInt(numRatings) : null,
    };
  } catch (e) {
    console.error("BGG detail fetch failed:", e);
    return null;
  }
}

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
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) throw new Error("Not authenticated");

    const { query, limit = 20 } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      throw new Error("Query must be at least 2 characters");
    }

    const searchTerm = query.trim();
    const normalizedSearch = normalizeTitle(searchTerm);

    // Step 1: Search internal database first
    const { data: internalResults } = await supabaseAdmin
      .from("master_games")
      .select("*")
      .or(`normalized_title.ilike.%${normalizedSearch}%,title.ilike.%${searchTerm}%`)
      .order("popularity_score", { ascending: false })
      .limit(limit);

    if (internalResults && internalResults.length >= 3) {
      // Log activity
      if (internalResults.length > 0) {
        await supabaseAdmin.from("activity_history").insert({
          user_id: user.id,
          game_id: internalResults[0].id,
          action_type: "search",
        });
      }

      return new Response(JSON.stringify({
        results: internalResults,
        source: "internal",
        total: internalResults.length,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Step 2: Search BGG API
    const searchUrl = `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(searchTerm)}&type=boardgame`;
    const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(10000) });
    const searchXml = await searchRes.text();

    // Extract all game IDs from search results
    const idMatches = [...searchXml.matchAll(/id="(\d+)"/g)];
    const bggIds = idMatches.slice(0, Math.min(10, limit)).map((m) => m[1]);

    if (bggIds.length === 0) {
      return new Response(JSON.stringify({
        results: internalResults || [],
        source: "internal",
        total: (internalResults || []).length,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch details for top results (batch by fetching multiple IDs)
    const batchIds = bggIds.join(",");
    const batchUrl = `https://boardgamegeek.com/xmlapi2/thing?id=${batchIds}&stats=1`;
    const batchRes = await fetch(batchUrl, { signal: AbortSignal.timeout(15000) });
    const batchXml = await batchRes.text();

    // Parse each <item> from the batch response
    const itemRegex = /<item[^>]*id="(\d+)"[^>]*>([\s\S]*?)<\/item>/g;
    const bggGames: any[] = [];
    let match;

    while ((match = itemRegex.exec(batchXml)) !== null) {
      const id = match[1];
      const xml = match[2];

      const name = xml.match(/<name type="primary"[^>]*value="([^"]+)"/)?.[1];
      if (!name) continue;

      const image = xml.match(/<image>([^<]+)<\/image>/)?.[1];
      const thumbnail = xml.match(/<thumbnail>([^<]+)<\/thumbnail>/)?.[1];
      const description = xml.match(/<description>([^<]*)<\/description>/)?.[1];
      const yearPublished = xml.match(/yearpublished value="(\d+)"/)?.[1];
      const minPlayers = xml.match(/minplayers value="(\d+)"/)?.[1];
      const maxPlayers = xml.match(/maxplayers value="(\d+)"/)?.[1];
      const minAge = xml.match(/minage value="(\d+)"/)?.[1];
      const playTime = xml.match(/playingtime value="(\d+)"/)?.[1];
      const publisher = xml.match(/<link type="boardgamepublisher"[^>]*value="([^"]+)"/)?.[1];
      const category = xml.match(/<link type="boardgamecategory"[^>]*value="([^"]+)"/)?.[1];
      const rating = xml.match(/<average value="([^"]+)"/)?.[1];
      const numRatings = xml.match(/<usersrated value="(\d+)"/)?.[1];

      bggGames.push({
        bgg_id: id,
        title: name,
        normalized_title: normalizeTitle(name),
        publisher: publisher || null,
        category: category || null,
        release_year: yearPublished ? parseInt(yearPublished) : null,
        cover_image_url: image || thumbnail || null,
        description: description
          ? description.substring(0, 1000).replace(/&#10;/g, "\n").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
          : null,
        min_players: minPlayers ? parseInt(minPlayers) : null,
        max_players: maxPlayers ? parseInt(maxPlayers) : null,
        min_age: minAge ? parseInt(minAge) : null,
        play_time: playTime || null,
        popularity_score: numRatings ? parseInt(numRatings) : 0,
      });
    }

    // Step 3: Upsert into master_games (cache for future)
    const savedGames: any[] = [];
    for (const game of bggGames) {
      // Check if already exists by normalized_title
      const { data: existing } = await supabaseAdmin
        .from("master_games")
        .select("*")
        .eq("normalized_title", game.normalized_title)
        .maybeSingle();

      if (existing) {
        savedGames.push({ ...existing, rating: game.rating, num_ratings: game.num_ratings });
      } else {
        const { data: inserted, error } = await supabaseAdmin
          .from("master_games")
          .insert({
            title: game.title,
            normalized_title: game.normalized_title,
            publisher: game.publisher,
            category: game.category,
            release_year: game.release_year,
            cover_image_url: game.cover_image_url,
            description: game.description,
            min_players: game.min_players,
            max_players: game.max_players,
            min_age: game.min_age,
            play_time: game.play_time,
            popularity_score: game.popularity_score,
          })
          .select()
          .single();

        if (!error && inserted) {
          savedGames.push(inserted);
        }
      }
    }

    // Merge with internal results (deduplicate)
    const allResults = [...(internalResults || [])];
    const existingIds = new Set(allResults.map((g) => g.id));
    for (const g of savedGames) {
      if (!existingIds.has(g.id)) {
        allResults.push(g);
      }
    }

    // Log activity
    if (allResults.length > 0) {
      await supabaseAdmin.from("activity_history").insert({
        user_id: user.id,
        game_id: allResults[0].id,
        action_type: "search",
      });
    }

    return new Response(JSON.stringify({
      results: allResults.slice(0, limit),
      source: "bgg",
      total: allResults.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("BGG search error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
