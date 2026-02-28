import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[COMPLETE-TRANSACTION] ${step}${detailsStr}`);
};

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
    if (!user) throw new Error("User not authenticated");

    const { transactionId } = await req.json();
    if (!transactionId) throw new Error("Missing transactionId");

    // Fetch transaction
    const { data: transaction, error: txError } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (txError || !transaction) throw new Error("Transaction not found");
    if (transaction.seller_id !== user.id && transaction.buyer_id !== user.id) {
      throw new Error("Only the seller or buyer can complete this transaction");
    }
    if (transaction.status !== "pending") throw new Error("Transaction is not pending");

    // Check expiry
    if (transaction.expires_at && new Date(transaction.expires_at) < new Date()) {
      await supabaseAdmin
        .from("transactions")
        .update({ status: "expired" })
        .eq("id", transactionId);
      throw new Error("Transaction has expired");
    }

    // For card payments with escrow, set escrow release time
    const escrowReleaseAt = transaction.method === "card" 
      ? new Date(Date.now() + ESCROW_HOLD_HOURS * 60 * 60 * 1000).toISOString()
      : null;

    // Mark as completed with escrow status
    await supabaseAdmin
      .from("transactions")
      .update({ 
        status: "completed",
        completed_at: new Date().toISOString(),
        escrow_status: transaction.method === "card" ? "pending_escrow" : "none",
        escrow_release_at: escrowReleaseAt,
      })
      .eq("id", transactionId);

    // Mark game as sold
    await supabaseAdmin
      .from("games")
      .update({ status: "sold" })
      .eq("id", transaction.post_id);

    // Award XP only for Stripe-verified transactions (card payments)
    if (transaction.method === "card") {
      // Award seller XP
      const { data: sellerProfile } = await supabaseAdmin
        .from("profiles")
        .select("xp")
        .eq("user_id", transaction.seller_id)
        .single();

      if (sellerProfile) {
        await supabaseAdmin
          .from("profiles")
          .update({ xp: (sellerProfile.xp || 0) + 100 })
          .eq("user_id", transaction.seller_id);

        await supabaseAdmin
          .from("xp_transactions")
          .insert({
            user_id: transaction.seller_id,
            amount: 100,
            reason: "Vente vérifiée via Stripe",
          });
      }

      // Award buyer XP if buyer exists
      if (transaction.buyer_id) {
        const { data: buyerProfile } = await supabaseAdmin
          .from("profiles")
          .select("xp")
          .eq("user_id", transaction.buyer_id)
          .single();

        if (buyerProfile) {
          await supabaseAdmin
            .from("profiles")
            .update({ xp: (buyerProfile.xp || 0) + 40 })
            .eq("user_id", transaction.buyer_id);

          await supabaseAdmin
            .from("xp_transactions")
            .insert({
              user_id: transaction.buyer_id,
              amount: 40,
              reason: "Achat vérifié via Stripe",
            });
        }
      }

      logStep("XP awarded for Stripe-verified transaction");
    } else {
      logStep("No XP awarded - cash transaction (not Stripe-verified)");
    }

    logStep("Transaction completed", { 
      transactionId, 
      gameId: transaction.post_id,
      method: transaction.method,
      escrowStatus: transaction.method === "card" ? "pending_escrow" : "none",
    });

    return new Response(JSON.stringify({ 
      success: true,
      escrowStatus: transaction.method === "card" ? "pending_escrow" : "none",
      escrowReleaseAt,
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
