ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS login_password TEXT;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

UPDATE public.profiles
SET login_password = CASE LOWER(email)
  WHEN 'brunogomestjf@gmail.com' THEN 'Brunogomes2005!'
  WHEN 'pedroojuann1@gmail.com' THEN 'Pedro2024!'
  WHEN 'cledinhosport10@gmail.com' THEN 'Cled2001'
  WHEN 'josehebert103@gmail.com' THEN 'josehebert123'
  WHEN 'miguelfrancisco232490@gmail.com' THEN 'Miguel24'
  WHEN 'feliperangel.rego03@gmail.com' THEN '343802'
  WHEN 'comercial@great.com' THEN 'demo123'
  WHEN 'gestor@great.com' THEN 'demo123'
  WHEN 'atendente@great.com' THEN 'demo123'
  WHEN 'coordenador@great.com' THEN 'demo123'
  WHEN 'design@great.com' THEN 'demo123'
  WHEN 'editor@great.com' THEN 'demo123'
  WHEN 'user@teste.com' THEN '123456'
  WHEN 'admin@teste.com' THEN '123456'
  WHEN 'isaquegreatsd@gmail.com' THEN 'Great2026!'
  WHEN 'gugaliraclash@gmail.com' THEN 'Great2026!'
  WHEN 'freitasviih00@gmail.com' THEN 'Great2026!'
  WHEN 'gersonlopesgreat@gmail.com' THEN 'Great2026!'
  WHEN 'ocdremex@gmail.com' THEN 'Great2026!'
  WHEN 'kauananderson1919@gmail.com' THEN 'Great2026!'
  WHEN 'amandagreatsd@gmail.com' THEN 'Great2026!'
  ELSE login_password
END
WHERE login_password IS NULL;

UPDATE public.profiles
SET is_admin = true
WHERE LOWER(email) IN ('brunogomestjf@gmail.com', 'pedroojuann1@gmail.com');
