import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-PAYMENT-REQUEST] ${step}${detailsStr}`);
};

const PLATFORM_COMMISSION_RATE = 0.07;

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
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);

    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("Seller authenticated", { userId: user.id });

    const { gameId, buyerId } = await req.json();

    if (!gameId || !buyerId) {
      throw new Error("Missing required fields: gameId, buyerId");
    }

    if (buyerId === user.id) {
      throw new Error("Cannot send payment request to yourself");
    }

    // Verify game exists, belongs to seller, and is available
    const { data: game, error: gameError } = await supabaseAdmin
      .from("games")
      .select("*")
      .eq("id", gameId)
      .single();

    if (gameError || !game) throw new Error("Game not found");
    if (game.owner_id !== user.id) throw new Error("Only the seller can send payment requests");
    if (game.status !== "available") throw new Error("Game is not available for sale");
    if (game.game_type !== "sale") throw new Error("This game is not listed for sale");
    if (!game.price || game.price <= 0) throw new Error("Game has no valid price");

    const gamePrice = Number(game.price);
    const platformFee = Math.round(gamePrice * PLATFORM_COMMISSION_RATE * 100) / 100;

    // Rate limiting: check if seller already has a pending request for this game
    const { data: existingRequests } = await supabaseAdmin
      .from("transactions")
      .select("id")
      .eq("post_id", gameId)
      .eq("seller_id", user.id)
      .eq("status", "pending")
      .eq("method", "remote");

    if (existingRequests && existingRequests.length >= 3) {
      throw new Error("Too many pending payment requests for this game. Wait for existing ones to expire.");
    }

    // Verify buyer exists
    const { data: buyerProfile } = await supabaseAdmin
      .from("profiles")
      .select("user_id, full_name")
      .eq("user_id", buyerId)
      .single();

    if (!buyerProfile) throw new Error("Buyer not found");

    logStep("Creating remote payment request", { gameId, buyerId, price: gamePrice });

    // Create transaction with 24h expiry
    const { data: transaction, error: txError } = await supabaseAdmin
      .from("transactions")
      .insert({
        post_id: gameId,
        seller_id: user.id,
        buyer_id: buyerId,
        amount: gamePrice,
        platform_fee: platformFee,
        method: "remote",
        status: "pending",
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (txError) throw new Error(`Failed to create transaction: ${txError.message}`);

    logStep("Payment request created", { transactionId: transaction.id });

    return new Response(JSON.stringify({
      transactionId: transaction.id,
      gameTitle: game.title,
      price: gamePrice,
      buyerName: buyerProfile.full_name,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
