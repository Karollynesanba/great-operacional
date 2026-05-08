-- Keep the app aligned with Supabase Auth so browser sessions are shared everywhere.
-- Remove legacy profile rows that do not belong to a real auth user, then restore the FK.

DELETE FROM public.profiles
WHERE NOT EXISTS (
  SELECT 1
  FROM auth.users u
  WHERE u.id = public.profiles.id
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_id_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;
