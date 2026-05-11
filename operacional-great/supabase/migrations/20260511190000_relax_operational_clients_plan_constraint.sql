-- Allow operational clients imports to preserve the plan values coming from the CSV.
-- Older production databases may still have the legacy plan check constraint.

ALTER TABLE public.operational_clients
  DROP CONSTRAINT IF EXISTS operational_clients_plan_check;

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;
