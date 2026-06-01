-- Remove operational test profiles that should not remain visible in the user list.
-- Safe to re-run.

WITH target_profiles AS (
  SELECT id
  FROM public.profiles
  WHERE LOWER(email) LIKE '%.local'
     OR LOWER(full_name) LIKE '%karollyne%'
)
DELETE FROM public.user_roles
WHERE user_id IN (SELECT id FROM target_profiles);

DELETE FROM public.profiles
WHERE id IN (SELECT id FROM target_profiles);

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;
