import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type BootstrapPayload = {
  email?: string;
  password?: string;
  full_name?: string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body = (await req.json()) as BootstrapPayload;
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();
    const fullName = body.full_name?.trim() || email;

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: exactProfiles, error: exactProfileError } = await adminClient
      .from('profiles')
      .select('id, email, full_name, login_password, is_admin, operational_role, commercial_role, team_id, is_active')
      .eq('email', email)
      .limit(1);

    if (exactProfileError) {
      return new Response(
        JSON.stringify({ error: exactProfileError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let profile = exactProfiles?.[0] ?? null;

    if (!profile) {
      const { data: allProfiles, error: allProfilesError } = await adminClient
        .from('profiles')
        .select('id, email, full_name, login_password, is_admin, operational_role, commercial_role, team_id, is_active');

      if (allProfilesError) {
        return new Response(
          JSON.stringify({ error: allProfilesError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      profile = (allProfiles || []).find((row) => row.email?.trim().toLowerCase() === email) ?? null;
    }

    if (profile?.login_password && profile.login_password !== password) {
      return new Response(
        JSON.stringify({ error: 'Password mismatch' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: authUsers, error: authUsersError } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (authUsersError) {
      return new Response(
        JSON.stringify({ error: authUsersError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const existingAuthUser = authUsers.users.find((user) => (user.email || '').trim().toLowerCase() === email);

    let authUserId = existingAuthUser?.id ?? null;

    if (existingAuthUser) {
      const { error: updateError } = await adminClient.auth.admin.updateUserById(existingAuthUser.id, {
        email,
        password,
        user_metadata: {
          full_name: fullName,
        },
        email_confirm: true,
      });

      if (updateError) {
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    } else {
      const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
      });

      if (createError) {
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      authUserId = createdUser.user?.id ?? authUserId;
    }

    if (!profile) {
      const { error: profileInsertError } = await adminClient.from('profiles').upsert({
        id: authUserId || crypto.randomUUID(),
        email,
        full_name: fullName,
        avatar_url: null,
        is_active: true,
        login_password: password,
        operational_role: null,
        commercial_role: null,
        team_id: null,
        is_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

      if (profileInsertError) {
        return new Response(
          JSON.stringify({ error: profileInsertError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
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
