import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Use anon key to verify the requesting user's token
    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAnon.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const requestingUserId = claimsData.claims.sub;

    // Use SERVICE ROLE KEY only server-side for privileged operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Server-side role check via user_roles table (NOT users.role column)
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUserId)
      .in('role', ['admin', 'moderator'])
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(JSON.stringify({ error: 'Forbidden: insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const isAdmin = roleData.role === 'admin';

    const body = await req.json();
    const { targetUserId, reason, action, bannedUntil } = body;

    if (!targetUserId) {
      return new Response(JSON.stringify({ error: 'targetUserId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Prevent self-action
    if (targetUserId === requestingUserId) {
      return new Response(JSON.stringify({ error: 'Cannot perform this action on yourself' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Moderators cannot ban admins
    if (!isAdmin) {
      const { data: targetRole } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', targetUserId)
        .in('role', ['admin', 'moderator'])
        .maybeSingle();

      if (targetRole?.role === 'admin') {
        return new Response(JSON.stringify({ error: 'Moderators cannot ban admins' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    const validActions = ['ban', 'unban', 'suspend', 'warn'];
    const finalAction = action || 'ban';
    if (!validActions.includes(finalAction)) {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Execute the action
    if (finalAction === 'ban') {
      // Permanent ban: set banned_until far in future
      const permanentUntil = new Date('2099-12-31T23:59:59Z').toISOString();
      const { error: banError } = await supabaseAdmin
        .from('user_bans')
        .upsert({
          user_id: targetUserId,
          banned_until: bannedUntil || permanentUntil,
          reason: reason || 'Banned by admin'
        }, { onConflict: 'user_id' });

      if (banError) {
        console.error('Ban error:', banError);
        return new Response(JSON.stringify({ error: 'Failed to ban user' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } else if (finalAction === 'unban') {
      const { error: unbanError } = await supabaseAdmin
        .from('user_bans')
        .delete()
        .eq('user_id', targetUserId);

      if (unbanError) {
        return new Response(JSON.stringify({ error: 'Failed to unban user' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } else if (finalAction === 'suspend') {
      // Temporary suspension
      const suspendUntil = bannedUntil || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error: suspendError } = await supabaseAdmin
        .from('user_bans')
        .upsert({
          user_id: targetUserId,
          banned_until: suspendUntil,
          reason: reason || 'Suspended by admin'
        }, { onConflict: 'user_id' });

      if (suspendError) {
        return new Response(JSON.stringify({ error: 'Failed to suspend user' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Log every admin action — immutable audit trail
    await supabaseAdmin
      .from('admin_logs')
      .insert({
        admin_id: requestingUserId,
        action: finalAction,
        target_user_id: targetUserId,
        reason: reason || null,
        metadata: {
          admin_role: roleData.role,
          action_details: finalAction === 'suspend' ? { until: bannedUntil } : {}
        }
      });

    return new Response(
      JSON.stringify({ success: true, message: `Action '${finalAction}' applied to user` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
