-- Allow creative uploads to persist for Amanda and every other user,
-- and make uploaded creatives visible to all sessions immediately.

-- ---------------------------------------------------------------------------
-- Main creatives table
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.ad_creatives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Amanda and Matheus can insert ad creatives" ON public.ad_creatives;
DROP POLICY IF EXISTS "Amanda and Matheus can update ad creatives" ON public.ad_creatives;
DROP POLICY IF EXISTS "Amanda and Matheus can delete ad creatives" ON public.ad_creatives;
DROP POLICY IF EXISTS "Anyone can view ad creatives" ON public.ad_creatives;
DROP POLICY IF EXISTS "Anyone can insert ad creatives" ON public.ad_creatives;
DROP POLICY IF EXISTS "Anyone can update ad creatives" ON public.ad_creatives;
DROP POLICY IF EXISTS "Anyone can delete ad creatives" ON public.ad_creatives;
DROP POLICY IF EXISTS "Authenticated users can view ad creatives" ON public.ad_creatives;
DROP POLICY IF EXISTS "Authenticated users can insert ad creatives" ON public.ad_creatives;
DROP POLICY IF EXISTS "Authenticated users can update ad creatives" ON public.ad_creatives;
DROP POLICY IF EXISTS "Authenticated users can delete ad creatives" ON public.ad_creatives;
DROP POLICY IF EXISTS "Creators and admins can delete ad creatives" ON public.ad_creatives;

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
-- Realtime so every user sees new/edited creatives instantly
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'ad_creatives'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ad_creatives;
  END IF;
END $$;

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;
