-- Insere/reativa os criativos únicos encontrados no CSV de vendas de maio/2026.
-- Roda em segurança mais de uma vez por causa do ON CONFLICT.

INSERT INTO public.criativos (name)
VALUES
  ('FORMS CAIXINHA EVENTO 01'),
  ('INDICAÇÃO'),
  ('BOTOX'),
  ('FORMS ADS/EVENTO03'),
  ('FORMS CAIXINHA/OFICIAL00'),
  ('INSTAGRAM'),
  ('CAIXA DE PERGUNTA'),
  ('FORMS ESTÁTICO GOOGLE')
ON CONFLICT (name)
DO UPDATE SET
  is_active = true,
  updated_at = now();
