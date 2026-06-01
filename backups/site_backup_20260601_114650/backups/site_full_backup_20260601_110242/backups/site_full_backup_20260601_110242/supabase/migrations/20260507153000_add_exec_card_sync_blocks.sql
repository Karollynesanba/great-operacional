-- Persist manual deletions of synced ClickUp cards so they are not recreated by auto-sync.

CREATE TABLE IF NOT EXISTS public.exec_card_sync_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.exec_boards(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.operational_clients(id) ON DELETE CASCADE,
  created_by_user_id TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (board_id, client_id)
);

ALTER TABLE IF EXISTS public.exec_card_sync_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow exec card sync blocks select" ON public.exec_card_sync_blocks;
DROP POLICY IF EXISTS "Allow exec card sync blocks insert" ON public.exec_card_sync_blocks;
DROP POLICY IF EXISTS "Allow exec card sync blocks update" ON public.exec_card_sync_blocks;
DROP POLICY IF EXISTS "Allow exec card sync blocks delete" ON public.exec_card_sync_blocks;

CREATE POLICY "Allow exec card sync blocks select"
  ON public.exec_card_sync_blocks FOR SELECT USING (true);

CREATE POLICY "Allow exec card sync blocks insert"
  ON public.exec_card_sync_blocks FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow exec card sync blocks update"
  ON public.exec_card_sync_blocks FOR UPDATE USING (true);

CREATE POLICY "Allow exec card sync blocks delete"
  ON public.exec_card_sync_blocks FOR DELETE USING (true);
