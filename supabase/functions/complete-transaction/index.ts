import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[COMPLETE-TRANSACTION] ${step}${detailsStr}`);
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
    // Allow both seller and buyer to complete
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

    // Mark as completed
    await supabaseAdmin
      .from("transactions")
      .update({ 
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", transactionId);

    // Mark game as sold
    await supabaseAdmin
      .from("games")
      .update({ status: "sold" })
      .eq("id", transaction.post_id);

    logStep("Transaction completed", { transactionId, gameId: transaction.post_id });

    return new Response(JSON.stringify({ success: true }), {
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
