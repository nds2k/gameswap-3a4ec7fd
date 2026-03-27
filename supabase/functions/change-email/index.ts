import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// In-memory store for verification codes (per instance)
const verificationStore = new Map<string, { code: string; email: string; expiresAt: number; step: "verify_current" | "verify_new"; newEmail?: string }>();

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
    if (authError || !user) throw new Error("Non authentifié");

    const body = await req.json();
    const { action } = body;

    // Step 1: Initiate - send code to current email
    if (action === "initiate") {
      const { password } = body;
      if (!password) throw new Error("Mot de passe requis");

      // Verify password by attempting sign-in
      const { error: signInError } = await supabaseClient.auth.signInWithPassword({
        email: user.email!,
        password,
      });
      if (signInError) throw new Error("Mot de passe incorrect");

      const code = generateCode();
      verificationStore.set(user.id, {
        code,
        email: user.email!,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 min
        step: "verify_current",
      });

      // Send code via Supabase Auth (magic link workaround - we log the code for now)
      // In production, integrate with email service
      console.log(`Verification code for ${user.email}: ${code}`);

      // For demo: return code hint (first 2 chars)
      return new Response(JSON.stringify({
        success: true,
        step: "verify_current",
        hint: code.substring(0, 2) + "****",
        message: `Code envoyé à ${user.email?.replace(/(.{2})(.*)(@.*)/, "$1***$3")}`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Step 2: Verify current email code
    if (action === "verify_current") {
      const { code } = body;
      const stored = verificationStore.get(user.id);
      if (!stored || stored.step !== "verify_current") throw new Error("Aucune vérification en cours");
      if (Date.now() > stored.expiresAt) {
        verificationStore.delete(user.id);
        throw new Error("Code expiré");
      }
      if (stored.code !== code.toUpperCase()) throw new Error("Code incorrect");

      // Move to next step
      stored.step = "verify_new" as const;
      verificationStore.set(user.id, stored);

      return new Response(JSON.stringify({
        success: true,
        step: "enter_new_email",
        message: "Email actuel vérifié. Entrez votre nouvel email.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Step 3: Set new email and send verification code
    if (action === "set_new_email") {
      const { newEmail } = body;
      if (!newEmail || !newEmail.includes("@")) throw new Error("Email invalide");

      const stored = verificationStore.get(user.id);
      if (!stored || stored.step !== "verify_new") throw new Error("Étape de vérification incorrecte");

      const newCode = generateCode();
      stored.code = newCode;
      stored.newEmail = newEmail;
      stored.expiresAt = Date.now() + 10 * 60 * 1000;
      verificationStore.set(user.id, stored);

      console.log(`New email verification code for ${newEmail}: ${newCode}`);

      return new Response(JSON.stringify({
        success: true,
        step: "verify_new_email",
        hint: newCode.substring(0, 2) + "****",
        message: `Code envoyé à ${newEmail.replace(/(.{2})(.*)(@.*)/, "$1***$3")}`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Step 4: Verify new email code and apply change
    if (action === "verify_new") {
      const { code } = body;
      const stored = verificationStore.get(user.id);
      if (!stored || !stored.newEmail) throw new Error("Aucune vérification en cours");
      if (Date.now() > stored.expiresAt) {
        verificationStore.delete(user.id);
        throw new Error("Code expiré");
      }
      if (stored.code !== code.toUpperCase()) throw new Error("Code incorrect");

      // Apply email change via admin API
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        email: stored.newEmail,
      });
      if (updateError) throw updateError;

      verificationStore.delete(user.id);

      return new Response(JSON.stringify({
        success: true,
        step: "complete",
        message: "Email mis à jour avec succès !",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw new Error("Action inconnue");
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
