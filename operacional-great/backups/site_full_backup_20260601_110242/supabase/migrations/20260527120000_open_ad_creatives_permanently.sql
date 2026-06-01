-- Keep ad creatives writable for every session, without depending on auth.uid().
-- This is intentionally permissive so "save" never gets blocked by old RLS rules.

-- ---------------------------------------------------------------------------
-- Main creatives table
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.ad_creatives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view ad creatives" ON public.ad_creatives;
DROP POLICY IF EXISTS "Authenticated users can insert ad creatives" ON public.ad_creatives;
DROP POLICY IF EXISTS "Authenticated users can update ad creatives" ON public.ad_creatives;
DROP POLICY IF EXISTS "Creators and admins can delete ad creatives" ON public.ad_creatives;
DROP POLICY IF EXISTS "Anyone can view ad creatives" ON public.ad_creatives;
DROP POLICY IF EXISTS "Anyone can insert ad creatives" ON public.ad_creatives;
DROP POLICY IF EXISTS "Anyone can update ad creatives" ON public.ad_creatives;
DROP POLICY IF EXISTS "Anyone can delete ad creatives" ON public.ad_creatives;
DROP POLICY IF EXISTS "Public can view ad creatives" ON public.ad_creatives;
DROP POLICY IF EXISTS "Public can insert ad creatives" ON public.ad_creatives;
DROP POLICY IF EXISTS "Public can update ad creatives" ON public.ad_creatives;
DROP POLICY IF EXISTS "Public can delete ad creatives" ON public.ad_creatives;

CREATE POLICY "Public can view ad creatives"
ON public.ad_creatives
FOR SELECT
TO public
USING (true);

CREATE POLICY "Public can insert ad creatives"
ON public.ad_creatives
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Public can update ad creatives"
ON public.ad_creatives
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Public can delete ad creatives"
ON public.ad_creatives
FOR DELETE
TO public
USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_creatives TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Creative images bucket
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('ad-creatives', 'ad-creatives', true)
ON CONFLICT (id)
DO UPDATE SET
  name = EXCLUDED.name,
  public = true;

DROP POLICY IF EXISTS "Anyone can view ad creative images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload ad creative images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete ad creative images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload ad creative images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete ad creative images" ON storage.objects;
DROP POLICY IF EXISTS "Amanda and Matheus can upload ad creative images" ON storage.objects;
DROP POLICY IF EXISTS "Amanda and Matheus can delete ad creative images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view ad creative images" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload ad creative images" ON storage.objects;
DROP POLICY IF EXISTS "Public can delete ad creative images" ON storage.objects;

CREATE POLICY "Public can view ad creative images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'ad-creatives');

CREATE POLICY "Public can upload ad creative images"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'ad-creatives');

CREATE POLICY "Public can delete ad creative images"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'ad-creatives');

-- ---------------------------------------------------------------------------
-- Activity tracking, because adding a creative also writes a tracking row.
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.client_activity_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view all activity tracking" ON public.client_activity_tracking;
DROP POLICY IF EXISTS "Authenticated users can insert activity tracking" ON public.client_activity_tracking;
DROP POLICY IF EXISTS "Authenticated users can update activity tracking" ON public.client_activity_tracking;
DROP POLICY IF EXISTS "Authenticated users can delete activity tracking" ON public.client_activity_tracking;
DROP POLICY IF EXISTS "Anyone can view activity tracking" ON public.client_activity_tracking;
DROP POLICY IF EXISTS "Anyone can insert activity tracking" ON public.client_activity_tracking;
DROP POLICY IF EXISTS "Anyone can update activity tracking" ON public.client_activity_tracking;
DROP POLICY IF EXISTS "Anyone can delete activity tracking" ON public.client_activity_tracking;
DROP POLICY IF EXISTS "Public can view activity tracking" ON public.client_activity_tracking;
DROP POLICY IF EXISTS "Public can insert activity tracking" ON public.client_activity_tracking;
DROP POLICY IF EXISTS "Public can update activity tracking" ON public.client_activity_tracking;
DROP POLICY IF EXISTS "Public can delete activity tracking" ON public.client_activity_tracking;

CREATE POLICY "Public can view activity tracking"
ON public.client_activity_tracking
FOR SELECT
TO public
USING (true);

CREATE POLICY "Public can insert activity tracking"
ON public.client_activity_tracking
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Public can update activity tracking"
ON public.client_activity_tracking
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Public can delete activity tracking"
ON public.client_activity_tracking
FOR DELETE
TO public
USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_activity_tracking TO anon, authenticated, service_role;

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;
