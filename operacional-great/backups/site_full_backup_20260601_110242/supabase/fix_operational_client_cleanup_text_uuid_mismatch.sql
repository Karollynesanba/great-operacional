-- Fix the operational client cleanup function for databases where some
-- child tables store IDs as text instead of uuid.
-- This replaces the delete cleanup and the RPC delete with text-safe casts.

CREATE OR REPLACE FUNCTION public.cleanup_on_operational_client_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF to_regclass('public.client_start_form_responses') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.client_start_form_responses WHERE client_id::text = $1::text' USING OLD.id;
  END IF;

  IF to_regclass('public.client_activity_tracking') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.client_activity_tracking WHERE client_id::text = $1::text' USING OLD.id;
  END IF;

  IF to_regclass('public.client_files') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.client_files WHERE client_id::text = $1::text' USING OLD.id;
  END IF;

  IF to_regclass('public.ad_creatives') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.ad_creatives WHERE client_id::text = $1::text' USING OLD.id;
  END IF;

  IF to_regclass('public.crm_events') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.crm_events WHERE client_id::text = $1::text' USING OLD.id;
  END IF;

  IF to_regclass('public.my_day_items') IS NOT NULL AND to_regclass('public.work_items') IS NOT NULL THEN
    EXECUTE $sql$
      DELETE FROM public.my_day_items
      WHERE source = 'WORKITEM'
        AND source_id::text IN (
          SELECT id::text
          FROM public.work_items
          WHERE related_client_id::text = $1::text
        )
    $sql$ USING OLD.id;
  END IF;

  IF to_regclass('public.work_items') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.work_items WHERE related_client_id::text = $1::text' USING OLD.id;
  END IF;

  IF to_regclass('public.projects') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.projects WHERE client_id::text = $1::text' USING OLD.id;
  END IF;

  IF to_regclass('public.exec_cards') IS NOT NULL THEN
    EXECUTE 'UPDATE public.exec_cards SET client_id = NULL WHERE client_id::text = $1::text' USING OLD.id;
  END IF;

  IF to_regclass('public.exec_card_sync_blocks') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.exec_card_sync_blocks WHERE client_id::text = $1::text' USING OLD.id;
  END IF;

  IF to_regclass('public.crisis_manual_clients') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.crisis_manual_clients WHERE source_operational_client_id::text = $1::text OR id::text = $1::text' USING OLD.id;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS operational_clients_cleanup_before_delete ON public.operational_clients;
CREATE TRIGGER operational_clients_cleanup_before_delete
BEFORE DELETE ON public.operational_clients
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_on_operational_client_delete();

CREATE OR REPLACE FUNCTION public.delete_operational_client_cascade(p_client_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF to_regclass('public.client_start_form_responses') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.client_start_form_responses WHERE client_id::text = $1::text' USING p_client_id;
  END IF;

  IF to_regclass('public.client_activity_tracking') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.client_activity_tracking WHERE client_id::text = $1::text' USING p_client_id;
  END IF;

  IF to_regclass('public.client_files') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.client_files WHERE client_id::text = $1::text' USING p_client_id;
  END IF;

  IF to_regclass('public.ad_creatives') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.ad_creatives WHERE client_id::text = $1::text' USING p_client_id;
  END IF;

  IF to_regclass('public.crm_events') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.crm_events WHERE client_id::text = $1::text' USING p_client_id;
  END IF;

  IF to_regclass('public.my_day_items') IS NOT NULL AND to_regclass('public.work_items') IS NOT NULL THEN
    EXECUTE $sql$
      DELETE FROM public.my_day_items
      WHERE source = 'WORKITEM'
        AND source_id::text IN (
          SELECT id::text
          FROM public.work_items
          WHERE related_client_id::text = $1::text
        )
    $sql$ USING p_client_id;
  END IF;

  IF to_regclass('public.work_items') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.work_items WHERE related_client_id::text = $1::text' USING p_client_id;
  END IF;

  IF to_regclass('public.projects') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.projects WHERE client_id::text = $1::text' USING p_client_id;
  END IF;

  IF to_regclass('public.exec_cards') IS NOT NULL THEN
    EXECUTE 'UPDATE public.exec_cards SET client_id = NULL WHERE client_id::text = $1::text' USING p_client_id;
  END IF;

  IF to_regclass('public.exec_card_sync_blocks') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.exec_card_sync_blocks WHERE client_id::text = $1::text' USING p_client_id;
  END IF;

  IF to_regclass('public.crisis_manual_clients') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.crisis_manual_clients WHERE source_operational_client_id::text = $1::text OR id::text = $1::text' USING p_client_id;
  END IF;

  IF to_regclass('public.operational_clients') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.operational_clients WHERE id::text = $1::text' USING p_client_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_operational_client_cascade(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_operational_client_cascade(UUID) TO anon, authenticated, service_role;

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;
