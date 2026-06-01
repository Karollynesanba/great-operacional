-- Remove deprecated test/broken logins so all browsers start from the same shared account base.
-- These accounts were superseded by the canonical auth seed and should not remain in profiles.

DELETE FROM public.profiles
WHERE lower(email) IN (
  'gestor@great.com',
  'comercial@great.com',
  'feliperangel.rego03@gmail.com',
  'design@great.com',
  'coordenador@great.com',
  'editor@great.com',
  'atendente@great.com'
);
