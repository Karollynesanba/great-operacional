-- Make operational logins persist independently from Supabase Auth.
-- The app manages its own users, so `profiles` needs to accept app-generated UUIDs
-- and be writable/readable from the browser to keep logins consistent across devices.

-- Remove the auth.users dependency so app-generated profile IDs can be stored.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Keep RLS enabled, but open the table to the operational app.
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can delete profiles" ON public.profiles;

CREATE POLICY "Anyone can read profiles"
ON public.profiles
FOR SELECT
TO public
USING (true);

CREATE POLICY "Anyone can insert profiles"
ON public.profiles
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Anyone can update profiles"
ON public.profiles
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can delete profiles"
ON public.profiles
FOR DELETE
TO public
USING (true);
