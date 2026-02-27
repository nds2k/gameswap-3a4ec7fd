import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-SELLER] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("User not authenticated");
    
    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { email, phone, firstName, lastName, iban } = await req.json();

    // Validate inputs
    if (!email || !firstName || !lastName || !iban) {
      throw new Error("Champs obligatoires manquants: email, prénom, nom, IBAN");
    }

    // Validate IBAN format (basic check)
    const cleanIban = iban.replace(/\s/g, "").toUpperCase();
    if (cleanIban.length < 15 || cleanIban.length > 34) {
      throw new Error("Format IBAN invalide");
    }

    // Check if user already has a connect account
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_connect_account_id, stripe_onboarding_complete")
      .eq("user_id", user.id)
      .single();

    if (profile?.stripe_connect_account_id && profile?.stripe_onboarding_complete) {
      throw new Error("Vous avez déjà un compte vendeur actif");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    let accountId = profile?.stripe_connect_account_id;

    if (!accountId) {
      // Create a new Express connected account
      logStep("Creating Stripe Connect account");
      const account = await stripe.accounts.create({
        type: "express",
        email: email,
        country: "FR",
        capabilities: {
          transfers: { requested: true },
        },
        business_type: "individual",
        individual: {
          first_name: firstName,
          last_name: lastName,
          email: email,
          ...(phone ? { phone } : {}),
        },
        external_account: {
          object: "bank_account",
          country: "FR",
          currency: "eur",
          account_number: cleanIban,
        },
        metadata: {
          gameswap_user_id: user.id,
        },
      });

      accountId = account.id;
      logStep("Account created", { accountId });

      // Save to profile
      await supabaseAdmin
        .from("profiles")
        .update({ stripe_connect_account_id: accountId })
        .eq("user_id", user.id);
    }

    // Create an account link for onboarding completion
    const origin = req.headers.get("origin") || "https://gameswap.lovable.app";
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/settings?stripe=refresh`,
      return_url: `${origin}/settings?stripe=complete`,
      type: "account_onboarding",
    });

    logStep("Account link created", { url: accountLink.url });

    return new Response(JSON.stringify({ 
      success: true, 
      accountId, 
      onboardingUrl: accountLink.url 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ success: false, error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
