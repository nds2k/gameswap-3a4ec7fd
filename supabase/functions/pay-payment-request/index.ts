import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAY-PAYMENT-REQUEST] ${step}${detailsStr}`);
};

const PLATFORM_COMMISSION_RATE = 0.07;
const ESCROW_HOLD_HOURS = 48;

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
    logStep("Buyer authenticated", { userId: user.id, email: user.email });

    const { transactionId } = await req.json();
    if (!transactionId) throw new Error("Missing transactionId");

    // Fetch the transaction
    const { data: transaction, error: txError } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (txError || !transaction) throw new Error("Payment request not found");

    // Security validations
    if (transaction.buyer_id !== user.id) {
      throw new Error("This payment request is not addressed to you");
    }
    if (transaction.status !== "pending") {
      throw new Error("This payment request is no longer valid");
    }
    if (transaction.method !== "remote") {
      throw new Error("Invalid payment request type");
    }

    // Check expiry
    if (transaction.expires_at && new Date(transaction.expires_at) < new Date()) {
      await supabaseAdmin
        .from("transactions")
        .update({ status: "expired" })
        .eq("id", transactionId);
      throw new Error("This payment request has expired");
    }

    // Fetch seller's Stripe Connect account for destination charge
    const { data: sellerProfile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_connect_account_id, stripe_onboarding_complete")
      .eq("user_id", transaction.seller_id)
      .single();

    if (!sellerProfile?.stripe_connect_account_id) {
      throw new Error("Seller does not have a verified payment account");
    }

    const sellerStripeAccountId = sellerProfile.stripe_connect_account_id;

    // Fetch game details for Stripe description
    const { data: game } = await supabaseAdmin
      .from("games")
      .select("title")
      .eq("id", transaction.post_id)
      .single();

    const gameTitle = game?.title || "Jeu";
    const amount = Number(transaction.amount);
    const applicationFeeAmount = Math.round(amount * PLATFORM_COMMISSION_RATE * 100);

    logStep("Creating Stripe checkout with destination charge", { 
      transactionId, amount, destination: sellerStripeAccountId 
    });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Verify seller's Stripe account is enabled
    const stripeAccount = await stripe.accounts.retrieve(sellerStripeAccountId);
    if (!stripeAccount.charges_enabled) {
      throw new Error("Seller's payment account is not fully verified");
    }

    // Check if buyer already has a Stripe customer record
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) customerId = customers.data[0].id;

    const origin = req.headers.get("origin") || "https://gameswap.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: gameTitle,
              description: `Achat du jeu "${gameTitle}" sur GameSwap`,
            },
            unit_amount: Math.round(amount * 100),
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
      success_url: `${origin}/payment-requests?payment=success&transaction=${transactionId}`,
      cancel_url: `${origin}/payment-requests?payment=cancelled`,
      metadata: {
        transaction_id: transactionId,
        game_id: transaction.post_id,
        seller_id: transaction.seller_id,
        seller_stripe_account: sellerStripeAccountId,
        buyer_id: user.id,
        method: "remote",
      },
    });

    // Update transaction with Stripe session and escrow info
    const escrowReleaseAt = new Date(Date.now() + ESCROW_HOLD_HOURS * 60 * 60 * 1000).toISOString();
    await supabaseAdmin
      .from("transactions")
      .update({
        stripe_checkout_session_id: session.id,
        buyer_email: user.email,
        escrow_status: "pending_escrow",
        escrow_release_at: escrowReleaseAt,
      })
      .eq("id", transactionId);

    logStep("Destination charge checkout created", { sessionId: session.id, destination: sellerStripeAccountId });

    return new Response(JSON.stringify({
      url: session.url,
      sessionId: session.id,
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
