import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type SyncPayload = {
  reporter_user_id?: string;
  items?: Array<{
    title: string;
    user_id: string;
    date: string;
    status: string;
    priority: string;
    source: string;
    source_id: string | null;
    assigned_to_user_id?: string | null;
    assigned_by_user_id?: string | null;
    origin_reporter_user_id?: string | null;
    deadline_date?: string | null;
    deadline_time?: string | null;
    deadline_notified?: boolean;
  }>;
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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
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

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body = (await req.json()) as SyncPayload;
    const items = Array.isArray(body.items) ? body.items : [];
    const reporterId = body.reporter_user_id || userData.user.id;

    let reporterProfile: { id: string; email: string | null } | null = null;

    const { data: profileById, error: profileByIdError } = await userClient
      .from('profiles')
      .select('id, email')
      .eq('id', reporterId)
      .maybeSingle();

    if (profileByIdError) {
      return new Response(
        JSON.stringify({ error: profileByIdError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    reporterProfile = profileById ?? null;

    if (!reporterProfile && userData.user.email) {
      const { data: profileByEmail, error: profileByEmailError } = await userClient
        .from('profiles')
        .select('id, email')
        .eq('email', userData.user.email)
        .maybeSingle();

      if (profileByEmailError) {
        return new Response(
          JSON.stringify({ error: profileByEmailError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      reporterProfile = profileByEmail ?? null;
    }

    const resolvedReporterId = reporterProfile?.id || userData.user.id;
    const normalizedAuthEmail = (userData.user.email || '').trim().toLowerCase();
    const normalizedReporterEmail = (reporterProfile?.email || '').trim().toLowerCase();
    const reporterMatchesAuth =
      reporterId === userData.user.id ||
      reporterId === resolvedReporterId ||
      (normalizedAuthEmail.length > 0 && normalizedAuthEmail === normalizedReporterEmail);

    if (!reporterMatchesAuth) {
      return new Response(
        JSON.stringify({ error: 'Invalid reporter' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (items.length === 0) {
      return new Response(
        JSON.stringify({ items: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const normalizedRows = items.map((item) => ({
      title: item.title,
      user_id: item.user_id,
      assigned_to_user_id: item.assigned_to_user_id || item.user_id,
      assigned_by_user_id: item.assigned_by_user_id || resolvedReporterId,
      date: item.date,
      source: item.source,
      source_id: item.source_id,
      status: item.status,
      priority: item.priority,
      origin_reporter_user_id: item.origin_reporter_user_id || resolvedReporterId,
      deadline_date: item.deadline_date || null,
      deadline_time: item.deadline_time || null,
      deadline_notified: item.deadline_notified ?? false,
    }));

    const targetUserIds = Array.from(new Set(normalizedRows.map((row) => row.user_id).filter(Boolean)));
    let exclusionRows: Array<{
      user_id: string;
      item_date: string;
      source: string;
      source_id: string | null;
      title: string;
    }> = [];

    if (targetUserIds.length > 0) {
      const { data: exclusions, error: exclusionError } = await adminClient
        .from('my_day_item_exclusions')
        .select('user_id,item_date,source,source_id,title')
        .in('user_id', targetUserIds);

      if (exclusionError) {
        return new Response(
          JSON.stringify({ error: exclusionError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      exclusionRows = (exclusions ?? []) as typeof exclusionRows;
    }

    const isExcluded = (row: (typeof normalizedRows)[number]) => {
      const sourceId = (row.source_id || '').trim();
      return exclusionRows.some((exclusion) => {
        if (exclusion.user_id !== row.user_id) return false;
        if (exclusion.source !== row.source) return false;

        if (sourceId.length > 0) {
          return (exclusion.source_id || '').trim() === sourceId;
        }

        return (
          exclusion.item_date === row.date &&
          exclusion.title.trim().toLowerCase() === row.title.trim().toLowerCase()
        );
      });
    };

    const rowsToUpsert = normalizedRows.filter((row) => !isExcluded(row));

    if (rowsToUpsert.length === 0) {
      return new Response(
        JSON.stringify({ items: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data, error } = await adminClient
      .from('my_day_items')
      .upsert(rowsToUpsert, {
        onConflict: 'user_id,date,source,source_id,title',
      })
      .select('id,title,status,priority,source,source_id,user_id');

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ items: data ?? [] }),
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
