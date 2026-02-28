import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-GAME-SALE] ${step}${detailsStr}`);
};

const PLATFORM_COMMISSION_RATE = 0.07; // 7% commission on card payments
const CASH_SERVICE_FEE = 0.99; // 0.99€ fixed fee for cash in person transactions
const ESCROW_HOLD_HOURS = 48; // 48h escrow hold

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
    logStep("Seller authenticated", { userId: user.id, email: user.email });

    const { gameId, method } = await req.json();
    
    if (!gameId || !method) {
      throw new Error("Missing required fields: gameId, method");
    }
    if (!["cash", "card"].includes(method)) {
      throw new Error("Invalid method. Must be 'cash' or 'card'");
    }

    // Fetch game from DB to lock the price server-side
    const { data: game, error: gameError } = await supabaseAdmin
      .from("games")
      .select("*")
      .eq("id", gameId)
      .single();

    if (gameError || !game) throw new Error("Game not found");
    if (game.owner_id !== user.id) throw new Error("Only the seller can initiate a sale");
    if (game.status !== "available") throw new Error("Game is not available for sale");
    if (game.game_type !== "sale") throw new Error("This game is not listed for sale");
    if (!game.price || game.price <= 0) throw new Error("Game has no valid price");

    const gamePrice = Number(game.price);
    logStep("Game verified", { gameId, title: game.title, price: gamePrice, method });

    // Fetch seller's Stripe Connect account
    const { data: sellerProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("stripe_connect_account_id, stripe_onboarding_complete")
      .eq("user_id", user.id)
      .single();

    if (profileError || !sellerProfile) throw new Error("Seller profile not found");
    if (!sellerProfile.stripe_connect_account_id) throw new Error("Seller does not have a Stripe account. Please complete onboarding first.");
    if (!sellerProfile.stripe_onboarding_complete) throw new Error("Seller Stripe onboarding is incomplete.");

    const sellerStripeAccountId = sellerProfile.stripe_connect_account_id;
    logStep("Seller Stripe account verified", { sellerStripeAccountId });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Verify the Stripe account is fully enabled
    const stripeAccount = await stripe.accounts.retrieve(sellerStripeAccountId);
    if (!stripeAccount.charges_enabled || !stripeAccount.payouts_enabled) {
      throw new Error("Seller Stripe account is not fully enabled. Please complete verification.");
    }
    logStep("Stripe account fully enabled", { charges: stripeAccount.charges_enabled, payouts: stripeAccount.payouts_enabled });

    const origin = req.headers.get("origin") || "https://gameswap.lovable.app";
    const escrowReleaseAt = new Date(Date.now() + ESCROW_HOLD_HOURS * 60 * 60 * 1000).toISOString();

    if (method === "cash") {
      // Cash flow: seller pays 0.99€ service fee, no destination charge needed
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      let customerId: string | undefined;
      if (customers.data.length > 0) customerId = customers.data[0].id;

      const { data: transaction, error: txError } = await supabaseAdmin
        .from("transactions")
        .insert({
          post_id: gameId,
          seller_id: user.id,
          amount: gamePrice,
          platform_fee: CASH_SERVICE_FEE,
          method: "cash",
          status: "pending",
          escrow_status: "none", // Cash transactions have no escrow
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (txError) throw new Error(`Failed to create transaction: ${txError.message}`);
      logStep("Transaction created", { transactionId: transaction.id });

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "eur",
              product_data: {
                name: `Frais de service GameSwap`,
                description: `Enregistrement de la vente en espèces de "${game.title}" (${gamePrice}€)`,
              },
              unit_amount: Math.round(CASH_SERVICE_FEE * 100),
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${origin}/my-games?sale=success&transaction=${transaction.id}`,
        cancel_url: `${origin}/my-games?sale=cancelled`,
        metadata: {
          transaction_id: transaction.id,
          game_id: gameId,
          seller_id: user.id,
          method: "cash",
        },
      });

      await supabaseAdmin
        .from("transactions")
        .update({ stripe_checkout_session_id: session.id })
        .eq("id", transaction.id);

      logStep("Cash checkout session created", { sessionId: session.id });

      return new Response(JSON.stringify({ 
        url: session.url, 
        sessionId: session.id,
        transactionId: transaction.id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } else {
      // Card flow: DESTINATION CHARGE to seller's Stripe account
      // Buyer pays full price, platform takes 7% fee, seller gets the rest
      const applicationFeeAmount = Math.round(gamePrice * PLATFORM_COMMISSION_RATE * 100); // in cents
      const platformFee = Math.round(gamePrice * PLATFORM_COMMISSION_RATE * 100) / 100;

      const { data: transaction, error: txError } = await supabaseAdmin
        .from("transactions")
        .insert({
          post_id: gameId,
          seller_id: user.id,
          amount: gamePrice,
          platform_fee: platformFee,
          method: "card",
          status: "pending",
          escrow_status: "pending_escrow",
          escrow_release_at: escrowReleaseAt,
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (txError) throw new Error(`Failed to create transaction: ${txError.message}`);
      logStep("Transaction created with escrow", { transactionId: transaction.id, escrowReleaseAt });

      // Create Stripe Checkout with destination charge to seller's connected account
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "eur",
              product_data: {
                name: game.title,
                description: `Achat du jeu "${game.title}" sur GameSwap`,
              },
              unit_amount: Math.round(gamePrice * 100),
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        // Route payment to seller's Stripe account with platform fee
        payment_intent_data: {
          application_fee_amount: applicationFeeAmount,
          transfer_data: {
            destination: sellerStripeAccountId,
          },
        },
        success_url: `${origin}/my-games?sale=success&transaction=${transaction.id}`,
        cancel_url: `${origin}/my-games?sale=cancelled`,
        metadata: {
          transaction_id: transaction.id,
          game_id: gameId,
          seller_id: user.id,
          seller_stripe_account: sellerStripeAccountId,
          method: "card",
        },
      });

      await supabaseAdmin
        .from("transactions")
        .update({ 
          stripe_checkout_session_id: session.id,
          payment_link_url: session.url,
        })
        .eq("id", transaction.id);

      logStep("Card destination charge session created", { 
        sessionId: session.id, 
        destination: sellerStripeAccountId,
        applicationFee: applicationFeeAmount,
      });

      return new Response(JSON.stringify({ 
        url: session.url, 
        sessionId: session.id,
        transactionId: transaction.id,
        gameTitle: game.title,
        price: gamePrice,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
