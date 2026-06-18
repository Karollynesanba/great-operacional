-- Fix start form report saves by aligning the author FK with the app user model.
-- The CRM stores the logged-in user in public.profiles, so this table should
-- reference profiles instead of auth.users.

ALTER TABLE public.client_start_form_responses
  DROP CONSTRAINT IF EXISTS client_start_form_responses_submitted_by_user_id_fkey;

UPDATE public.client_start_form_responses r
SET submitted_by_user_id = NULL
WHERE submitted_by_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = r.submitted_by_user_id
  );

WITH ranked_responses AS (
  SELECT
    ctid,
    ROW_NUMBER() OVER (
      PARTITION BY client_id
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.client_start_form_responses
)
DELETE FROM public.client_start_form_responses r
USING ranked_responses rr
WHERE r.ctid = rr.ctid
  AND rr.rn > 1;

ALTER TABLE public.client_start_form_responses
  ADD CONSTRAINT client_start_form_responses_submitted_by_user_id_fkey
  FOREIGN KEY (submitted_by_user_id)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

ALTER TABLE public.client_start_form_responses
  DROP CONSTRAINT IF EXISTS client_start_form_responses_client_id_key;

CREATE INDEX IF NOT EXISTS client_start_form_responses_client_id_idx
  ON public.client_start_form_responses (client_id, updated_at DESC, created_at DESC);
