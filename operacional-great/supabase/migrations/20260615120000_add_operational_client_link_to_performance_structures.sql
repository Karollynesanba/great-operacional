-- Allow Upgrade Amanda structures to link directly to CRM operational clients.
-- Keeps legacy brand_profiles rows working by making the old profile_id optional.

ALTER TABLE public.performance_structures
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.operational_clients(id) ON DELETE CASCADE;

ALTER TABLE public.performance_structures
  ALTER COLUMN profile_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS performance_structures_client_id_idx
  ON public.performance_structures(client_id);
