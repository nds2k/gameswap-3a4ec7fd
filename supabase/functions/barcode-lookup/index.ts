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

// Simple Levenshtein-based similarity (0-1)
function similarity(a: string, b: string): number {
  const la = a.length, lb = b.length;
  if (la === 0 || lb === 0) return 0;
  const matrix: number[][] = [];
  for (let i = 0; i <= la; i++) { matrix[i] = [i]; }
  for (let j = 0; j <= lb; j++) { matrix[0][j] = j; }
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return 1 - matrix[la][lb] / Math.max(la, lb);
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

    const { barcode } = await req.json();
    if (!barcode || typeof barcode !== "string" || barcode.length < 8) {
      throw new Error("Invalid barcode");
    }

    // Layer 1: O(1) indexed barcode lookup
    const { data: barcodeEntry } = await supabaseAdmin
      .from("game_barcodes")
      .select("*, master_games(*)")
      .eq("barcode", barcode)
      .maybeSingle();

    if (barcodeEntry?.master_games) {
      const g = barcodeEntry.master_games;
      // Fetch latest price
      const { data: priceData } = await supabaseAdmin
        .from("game_price_history")
        .select("average_price")
        .eq("game_id", g.id)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return new Response(JSON.stringify({
        found: true, source: "internal", confidence: barcodeEntry.confidence_score,
        game: { ...g, barcode, estimated_price: priceData?.average_price || null },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Layer 2: External API (BoardGameGeek)
    let bggGame: any = null;
    try {
      const searchUrl = `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(barcode)}&type=boardgame`;
      const searchRes = await fetch(searchUrl);
      const searchXml = await searchRes.text();
      const idMatch = searchXml.match(/id="(\d+)"/);

      if (idMatch) {
        const bggId = idMatch[1];
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
        const category = detailXml.match(/<link type="boardgamecategory"[^>]*value="([^"]+)"/)?.[1];

        if (name) {
          bggGame = {
            title: name,
            normalized_title: normalizeTitle(name),
            publisher: publisher || null,
            category: category || null,
            release_year: yearPublished ? parseInt(yearPublished) : null,
            cover_image_url: image || null,
            description: description ? description.substring(0, 500).replace(/&#10;/g, "\n").replace(/&amp;/g, "&") : null,
            min_players: minPlayers ? parseInt(minPlayers) : null,
            max_players: maxPlayers ? parseInt(maxPlayers) : null,
            min_age: minAge ? parseInt(minAge) : null,
            play_time: playTime || null,
          };
        }
      }
    } catch (e) {
      console.error("BGG lookup failed:", e);
    }

    if (bggGame) {
      // Layer 3: Fuzzy match against existing master_games
      const { data: existingGames } = await supabaseAdmin
        .from("master_games")
        .select("id, normalized_title, publisher")
        .limit(500);

      let bestMatchId: string | null = null;
      let bestScore = 0;

      if (existingGames) {
        for (const eg of existingGames) {
          let score = similarity(bggGame.normalized_title, eg.normalized_title);
          // Boost if publisher matches
          if (bggGame.publisher && eg.publisher &&
              normalizeTitle(bggGame.publisher) === normalizeTitle(eg.publisher)) {
            score = Math.min(1, score + 0.1);
          }
          if (score > bestScore) { bestScore = score; bestMatchId = eg.id; }
        }
      }

      let gameId: string;

      if (bestScore >= 0.9 && bestMatchId) {
        // Auto-match: just add barcode to existing game
        gameId = bestMatchId;
      } else {
        // Insert new master game
        const { data: inserted, error } = await supabaseAdmin
          .from("master_games")
          .insert(bggGame)
          .select()
          .single();
        if (error) throw error;
        gameId = inserted.id;
      }

      // Add barcode index
      const confidence = bestScore >= 0.9 ? bestScore : 0.8;
      await supabaseAdmin.from("game_barcodes").insert({
        game_id: gameId, barcode, confidence_score: confidence, source: "bgg",
      }).onConflict("barcode").merge();

      // Return full game
      const { data: fullGame } = await supabaseAdmin
        .from("master_games")
        .select("*")
        .eq("id", gameId)
        .single();

      return new Response(JSON.stringify({
        found: true, source: "bgg", confidence,
        game: { ...fullGame, barcode, estimated_price: null },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
