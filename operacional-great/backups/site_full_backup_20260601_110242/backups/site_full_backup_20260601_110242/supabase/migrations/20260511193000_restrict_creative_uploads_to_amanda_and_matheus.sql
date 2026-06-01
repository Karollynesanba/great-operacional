-- Restrict creative uploads and management to Amanda and Matheus.
-- Keep view access open, but only allow the responsible pair (and admins) to add, edit, or remove creatives.

CREATE OR REPLACE FUNCTION public.can_manage_ad_creatives(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = _user_id
      AND (
        LOWER(p.email) IN ('amanda.operacional@great.local', 'ocdremex@gmail.com')
        OR LOWER(p.full_name) IN ('amanda great', 'matheus tchaka')
      )
  )
  OR public.has_role(_user_id, 'admin'::public.app_role);
$$;

-- Ad creatives
ALTER TABLE IF EXISTS public.ad_creatives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view ad creatives" ON public.ad_creatives;
DROP POLICY IF EXISTS "Anyone can insert ad creatives" ON public.ad_creatives;
DROP POLICY IF EXISTS "Anyone can update ad creatives" ON public.ad_creatives;
DROP POLICY IF EXISTS "Anyone can delete ad creatives" ON public.ad_creatives;

CREATE POLICY "Anyone can view ad creatives"
ON public.ad_creatives
FOR SELECT
TO public
USING (true);

CREATE POLICY "Amanda and Matheus can insert ad creatives"
ON public.ad_creatives
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_ad_creatives(auth.uid()));

CREATE POLICY "Amanda and Matheus can update ad creatives"
ON public.ad_creatives
FOR UPDATE
TO authenticated
USING (public.can_manage_ad_creatives(auth.uid()))
WITH CHECK (public.can_manage_ad_creatives(auth.uid()));

CREATE POLICY "Amanda and Matheus can delete ad creatives"
ON public.ad_creatives
FOR DELETE
TO authenticated
USING (public.can_manage_ad_creatives(auth.uid()));

-- Creative storage bucket
DROP POLICY IF EXISTS "Anyone can view ad creative images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload ad creative images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete ad creative images" ON storage.objects;

CREATE POLICY "Anyone can view ad creative images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'ad-creatives');

CREATE POLICY "Amanda and Matheus can upload ad creative images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ad-creatives' AND public.can_manage_ad_creatives(auth.uid()));

CREATE POLICY "Amanda and Matheus can delete ad creative images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'ad-creatives' AND public.can_manage_ad_creatives(auth.uid()));

-- Client activity tracking should only be writable by the same pair or admins.
ALTER TABLE IF EXISTS public.client_activity_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view activity tracking" ON public.client_activity_tracking;
DROP POLICY IF EXISTS "Anyone can insert activity tracking" ON public.client_activity_tracking;
DROP POLICY IF EXISTS "Anyone can update activity tracking" ON public.client_activity_tracking;
DROP POLICY IF EXISTS "Anyone can delete activity tracking" ON public.client_activity_tracking;

CREATE POLICY "Anyone can view activity tracking"
ON public.client_activity_tracking
FOR SELECT
TO public
USING (true);

CREATE POLICY "Amanda and Matheus can insert activity tracking"
ON public.client_activity_tracking
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_ad_creatives(auth.uid()));

CREATE POLICY "Amanda and Matheus can update activity tracking"
ON public.client_activity_tracking
FOR UPDATE
TO authenticated
USING (public.can_manage_ad_creatives(auth.uid()))
WITH CHECK (public.can_manage_ad_creatives(auth.uid()));

CREATE POLICY "Amanda and Matheus can delete activity tracking"
ON public.client_activity_tracking
FOR DELETE
TO authenticated
USING (public.can_manage_ad_creatives(auth.uid()));

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;
