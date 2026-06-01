-- Delete one operational client and its dependent records in a single transaction.
-- This avoids front-end delete failures caused by child rows and RLS on related tables.

CREATE OR REPLACE FUNCTION public.delete_operational_client_cascade(p_client_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.client_activity_tracking
  WHERE client_id = p_client_id;

  DELETE FROM public.client_files
  WHERE client_id = p_client_id;

  DELETE FROM public.ad_creatives
  WHERE client_id = p_client_id;

  DELETE FROM public.crm_events
  WHERE client_id = p_client_id;

  DELETE FROM public.projects
  WHERE client_id = p_client_id;

  UPDATE public.exec_cards
  SET client_id = NULL
  WHERE client_id = p_client_id;

  DELETE FROM public.crisis_manual_clients
  WHERE source_operational_client_id = p_client_id::text
     OR id = p_client_id::text;

  DELETE FROM public.operational_clients
  WHERE id = p_client_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_operational_client_cascade(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_operational_client_cascade(UUID) TO anon, authenticated, service_role;

