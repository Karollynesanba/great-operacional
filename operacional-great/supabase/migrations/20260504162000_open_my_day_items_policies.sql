-- My Day is controlled by the application layer, not Supabase Auth.
-- Open the table policies so users can load and assign tasks without auth.uid().

DROP POLICY IF EXISTS "Users can view own my_day_items" ON public.my_day_items;
DROP POLICY IF EXISTS "Users can insert own my_day_items" ON public.my_day_items;
DROP POLICY IF EXISTS "Users can update own my_day_items" ON public.my_day_items;
DROP POLICY IF EXISTS "Users can delete own my_day_items" ON public.my_day_items;
DROP POLICY IF EXISTS "Users can view own my_day_items" ON public.my_day_items;
DROP POLICY IF EXISTS "Users can insert own my_day_items" ON public.my_day_items;
DROP POLICY IF EXISTS "Users can update own my_day_items" ON public.my_day_items;
DROP POLICY IF EXISTS "Users can delete own my_day_items" ON public.my_day_items;
DROP POLICY IF EXISTS "Authenticated users can insert work_item assignments for others" ON public.my_day_items;

CREATE POLICY "Allow my_day_items select"
ON public.my_day_items
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow my_day_items insert"
ON public.my_day_items
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow my_day_items update"
ON public.my_day_items
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow my_day_items delete"
ON public.my_day_items
FOR DELETE
TO authenticated
USING (true);
