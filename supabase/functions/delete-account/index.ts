import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");

    const userId = userData.user.id;
    const { action } = await req.json();

    if (action === "export") {
      // Export user data (GDPR portability)
      const [
        { data: profile },
        { data: games },
        { data: trades },
        { data: ratings },
        { data: favorites },
        { data: friendships },
      ] = await Promise.all([
        supabaseAdmin.from("profiles").select("*").eq("user_id", userId),
        supabaseAdmin.from("games").select("*").eq("owner_id", userId),
        supabaseAdmin.from("trades").select("*").or(`user1_id.eq.${userId},user2_id.eq.${userId}`),
        supabaseAdmin.from("ratings").select("*").or(`rater_id.eq.${userId},rated_user_id.eq.${userId}`),
        supabaseAdmin.from("favorites").select("*").eq("user_id", userId),
        supabaseAdmin.from("friendships").select("*").or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
      ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        user_id: userId,
        email: userData.user.email,
        profile,
        games,
        trades,
        ratings,
        favorites,
        friendships,
      };

      return new Response(JSON.stringify(exportData, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (action === "delete") {
      // Delete user data from all tables
      await Promise.all([
        supabaseAdmin.from("favorites").delete().eq("user_id", userId),
        supabaseAdmin.from("favorite_notifications").delete().eq("user_id", userId),
        supabaseAdmin.from("wishlist").delete().eq("user_id", userId),
        supabaseAdmin.from("message_reports").delete().eq("reporter_id", userId),
        supabaseAdmin.from("content_reports").delete().eq("reporter_id", userId),
        supabaseAdmin.from("forum_likes").delete().eq("user_id", userId),
        supabaseAdmin.from("user_roles").delete().eq("user_id", userId),
        supabaseAdmin.from("user_bans").delete().eq("user_id", userId),
      ]);

      // Delete games and associated images
      const { data: userGames } = await supabaseAdmin.from("games").select("id").eq("owner_id", userId);
      if (userGames) {
        for (const game of userGames) {
          await supabaseAdmin.from("game_images").delete().eq("game_id", game.id);
        }
      }
      await supabaseAdmin.from("games").delete().eq("owner_id", userId);

      // Delete profile
      await supabaseAdmin.from("profiles").delete().eq("user_id", userId);

      // Delete auth user
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteError) throw new Error(`Failed to delete account: ${deleteError.message}`);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    throw new Error("Invalid action. Use 'export' or 'delete'.");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});