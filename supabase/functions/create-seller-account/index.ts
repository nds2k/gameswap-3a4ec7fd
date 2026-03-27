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

    // Auth user
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("User not authenticated");

    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

    // Parse body
    const body = await req.json();
    const { firstName, lastName, dob, country, email, accountHolder, iban, address, city, postalCode } = body;

    if (!firstName || !lastName || !dob || !country || !iban) {
      throw new Error("Missing required fields");
    }

    // Check existing profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_connect_account_id, stripe_onboarding_complete")
      .eq("user_id", user.id)
      .single();

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    let accountId = profile?.stripe_connect_account_id;

    // If already fully onboarded, return early
    if (accountId && profile?.stripe_onboarding_complete) {
      const existing = await stripe.accounts.retrieve(accountId);
      if (existing.charges_enabled && existing.payouts_enabled) {
        return new Response(JSON.stringify({
          success: true,
          accountId,
          alreadyComplete: true,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Parse DOB
    const dobParts = dob.split("-");
    const dobObj = {
      year: parseInt(dobParts[0]),
      month: parseInt(dobParts[1]),
      day: parseInt(dobParts[2]),
    };

    if (!accountId) {
      // Create a Custom connected account with full data
      logStep("Creating Stripe Connect Custom account");
      const account = await stripe.accounts.create({
        type: "custom",
        country: country || "FR",
        email: email || user.email || undefined,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: "individual",
        individual: {
          first_name: firstName,
          last_name: lastName,
          dob: dobObj,
          email: email || user.email || undefined,
          address: {
            line1: address,
            city: city,
            postal_code: postalCode,
            country: country || "FR",
          },
        },
        business_profile: {
          mcc: "5945", // Hobby, Toy, and Game Shops
          url: "https://gameswap.lovable.app",
        },
        tos_acceptance: {
          date: Math.floor(Date.now() / 1000),
          ip: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "0.0.0.0",
        },
        metadata: {
          gameswap_user_id: user.id,
        },
      });

      accountId = account.id;
      logStep("Account created", { accountId });
    } else {
      // Update existing account with new data
      logStep("Updating existing account", { accountId });
      await stripe.accounts.update(accountId, {
        individual: {
          first_name: firstName,
          last_name: lastName,
          dob: dobObj,
          email: email || user.email || undefined,
          address: {
            line1: address,
            city: city,
            postal_code: postalCode,
            country: country || "FR",
          },
        },
      });
    }

    // Create bank account token and attach it
    logStep("Creating bank account");
    try {
      const bankToken = await stripe.tokens.create({
        bank_account: {
          country: country || "FR",
          currency: "eur",
          account_holder_name: accountHolder || `${firstName} ${lastName}`,
          account_holder_type: "individual",
          account_number: iban.replace(/\s/g, ""),
        },
      });

      await stripe.accounts.createExternalAccount(accountId, {
        external_account: bankToken.id,
      });
      logStep("Bank account attached");
    } catch (bankError: any) {
      logStep("Bank account error", { message: bankError.message });
      // If bank account fails, still save the account but report the error
      if (bankError.message?.includes("already has")) {
        logStep("Bank account already exists, continuing");
      } else {
        throw new Error(`Erreur IBAN : ${bankError.message}`);
      }
    }

    // Save to profile
    await supabaseAdmin
      .from("profiles")
      .update({
        stripe_connect_account_id: accountId,
        stripe_onboarding_complete: true,
      })
      .eq("user_id", user.id);

    logStep("Profile updated, onboarding complete");

    return new Response(JSON.stringify({
      success: true,
      accountId,
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
