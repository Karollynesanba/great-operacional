-- The operational app uses its own local login/session model, not Supabase Auth.
-- These policies keep creative uploads and activity tracking writable from the app
-- without depending on auth.uid(), which would block browser-side inserts/uploads.

-- ---------------------------------------------------------------------------
-- Ad creatives
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

CREATE POLICY "Anyone can view ad creatives"
ON public.ad_creatives
FOR SELECT
TO public
USING (true);

CREATE POLICY "Anyone can insert ad creatives"
ON public.ad_creatives
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Anyone can update ad creatives"
ON public.ad_creatives
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can delete ad creatives"
ON public.ad_creatives
FOR DELETE
TO public
USING (true);

-- ---------------------------------------------------------------------------
-- Creative storage bucket
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view ad creative images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload ad creative images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete ad creative images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload ad creative images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete ad creative images" ON storage.objects;

CREATE POLICY "Anyone can view ad creative images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'ad-creatives');

CREATE POLICY "Anyone can upload ad creative images"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'ad-creatives');

CREATE POLICY "Anyone can delete ad creative images"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'ad-creatives');

-- ---------------------------------------------------------------------------
-- Client activity tracking
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

CREATE POLICY "Anyone can view activity tracking"
ON public.client_activity_tracking
FOR SELECT
TO public
USING (true);

CREATE POLICY "Anyone can insert activity tracking"
ON public.client_activity_tracking
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Anyone can update activity tracking"
ON public.client_activity_tracking
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can delete activity tracking"
ON public.client_activity_tracking
FOR DELETE
TO public
USING (true);
