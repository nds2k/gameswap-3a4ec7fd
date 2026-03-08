import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizeTitle(title: string): string {
  return title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").trim();
}

async function searchBGG(query: string): Promise<any[]> {
  const url = `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(query)}&type=boardgame`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  const xml = await res.text();

  const ids: string[] = [];
  const regex = /id="(\d+)"/g;
  let match;
  while ((match = regex.exec(xml)) !== null && ids.length < 5) {
    ids.push(match[1]);
  }
  return ids;
}

async function fetchBGGDetails(bggId: string): Promise<any | null> {
  try {
    const url = `https://boardgamegeek.com/xmlapi2/thing?id=${bggId}&stats=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const xml = await res.text();

    const name = xml.match(/<name type="primary" sortindex="\d+" value="([^"]+)"/)?.[1];
    if (!name) return null;

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

    return {
      bgg_id: parseInt(bggId),
      title: name,
      normalized_title: normalizeTitle(name),
      publisher: publisher || null,
      category: category || null,
      release_year: yearPublished ? parseInt(yearPublished) : null,
      cover_image_url: image || null,
      thumbnail_url: thumbnail || null,
      description: description ? description.substring(0, 1000).replace(/&#10;/g, "\n").replace(/&amp;/g, "&").replace(/&quot;/g, '"') : null,
      min_players: minPlayers ? parseInt(minPlayers) : null,
      max_players: maxPlayers ? parseInt(maxPlayers) : null,
      min_age: minAge ? parseInt(minAge) : null,
      play_time: playTime || null,
      rating: rating ? parseFloat(rating) : 0,
      num_reviews: numRatings ? parseInt(numRatings) : 0,
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

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { query, bgg_id } = await req.json();

    // If fetching a specific BGG game by ID
    if (bgg_id) {
      // Check if already cached
      const { data: existing } = await supabaseAdmin
        .from("master_games")
        .select("*")
        .eq("bgg_id", parseInt(bgg_id))
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ game: existing }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const details = await fetchBGGDetails(bgg_id);
      if (!details) {
        return new Response(JSON.stringify({ error: "Game not found on BGG" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404,
        });
      }

      const { data: inserted, error } = await supabaseAdmin
        .from("master_games")
        .insert(details)
        .select()
        .single();

      if (error) {
        // Might be duplicate bgg_id race condition
        const { data: fallback } = await supabaseAdmin
          .from("master_games").select("*").eq("bgg_id", parseInt(bgg_id)).maybeSingle();
        if (fallback) {
          return new Response(JSON.stringify({ game: fallback }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw error;
      }

      return new Response(JSON.stringify({ game: inserted }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Search by query
    if (!query || typeof query !== "string" || query.length < 2) {
      return new Response(JSON.stringify({ error: "Query too short" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    // 1. Search internal DB first
    const normalizedQuery = normalizeTitle(query);
    const { data: internalResults } = await supabaseAdmin
      .from("master_games")
      .select("*")
      .ilike("normalized_title", `%${normalizedQuery}%`)
      .order("popularity_score", { ascending: false })
      .limit(10);

    // If we have enough internal results, return them
    if (internalResults && internalResults.length >= 3) {
      return new Response(JSON.stringify({ games: internalResults, source: "internal" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Search BGG
    const bggIds = await searchBGG(query);
    if (bggIds.length === 0) {
      return new Response(JSON.stringify({ games: internalResults || [], source: "internal" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch details for each BGG result
    const games: any[] = [...(internalResults || [])];
    const existingBggIds = new Set(games.filter(g => g.bgg_id).map(g => g.bgg_id));

    for (const id of bggIds) {
      if (existingBggIds.has(parseInt(id))) continue;

      // Check if already in DB
      const { data: existing } = await supabaseAdmin
        .from("master_games").select("*").eq("bgg_id", parseInt(id)).maybeSingle();

      if (existing) {
        games.push(existing);
        continue;
      }

      const details = await fetchBGGDetails(id);
      if (!details) continue;

      const { data: inserted, error } = await supabaseAdmin
        .from("master_games").insert(details).select().single();

      if (error) {
        // Race condition - try to fetch
        const { data: fallback } = await supabaseAdmin
          .from("master_games").select("*").eq("bgg_id", parseInt(id)).maybeSingle();
        if (fallback) games.push(fallback);
      } else {
        games.push(inserted);
      }
    }

    return new Response(JSON.stringify({ games, source: "bgg" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
