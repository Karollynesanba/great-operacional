import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: requestingUser },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: roleData, error: roleError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .eq('role', 'admin')
      .maybeSingle();

    const { data: profileData, error: profileError } = await adminClient
      .from('profiles')
      .select('id, full_name, email, is_admin')
      .eq('id', requestingUser.id)
      .maybeSingle();

    const isAdmin = Boolean(roleData || profileData?.is_admin);

    if ((roleError && !profileData?.is_admin) || !isAdmin) {
      console.error('User is not admin. Role data:', roleData, 'Role error:', roleError, 'Profile error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Only admins can delete users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { user_id } = await req.json().catch(() => ({}));
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: targetProfile, error: targetProfileError } = await adminClient
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', user_id)
      .maybeSingle();

    if (targetProfileError) {
      console.warn('Could not load target profile before delete:', targetProfileError);
    }

    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(user_id);
    if (authDeleteError) {
      console.warn('Auth delete failed, continuing with profile cleanup:', authDeleteError.message);
    }

    const [{ error: profileDeleteError }, { error: roleDeleteError }] = await Promise.all([
      adminClient.from('profiles').delete().eq('id', user_id),
      adminClient.from('user_roles').delete().eq('user_id', user_id),
    ]);

    if (profileDeleteError) {
      return new Response(
        JSON.stringify({ error: profileDeleteError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (roleDeleteError) {
      console.warn('Role cleanup failed while deleting user:', roleDeleteError.message);
    }

    await adminClient.from('activity_logs').insert({
      user_id: requestingUser.id,
      user_name: profileData?.full_name || requestingUser.user_metadata?.full_name || 'Admin',
      user_email: requestingUser.email || '',
      action: 'USER_DELETED',
      entity: 'profiles',
      entity_id: user_id,
      details: `Usuário removido: ${targetProfile?.full_name || targetProfile?.email || user_id}`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        auth_deleted: !authDeleteError,
        profile_deleted: true,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
