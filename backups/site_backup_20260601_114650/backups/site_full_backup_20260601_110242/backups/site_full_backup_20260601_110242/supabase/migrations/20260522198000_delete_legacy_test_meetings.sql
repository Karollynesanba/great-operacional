-- Remove legacy placeholder meetings that were created for testing and are
-- now surfacing as duplicate "xxx" cards in production.
-- This also cascades meeting action items because the FK uses ON DELETE CASCADE.

DELETE FROM public.meetings
WHERE
  title ~* '^x{3,}$'
  OR lower(trim(title)) IN (
    'reunião teste',
    'reuniao teste',
    'reuniao de teste',
    'meeting teste',
    'tentar ajustar ainda mais o site'
  );
