BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE lower(email) = 'amanda.operacional@great.local'
  ) THEN
    RAISE EXCEPTION 'Amanda profile not found in public.profiles';
  END IF;
END $$;

WITH amanda_profile AS (
  SELECT id
  FROM public.profiles
  WHERE lower(email) = 'amanda.operacional@great.local'
     OR lower(full_name) LIKE '%amanda%'
  ORDER BY CASE WHEN lower(email) = 'amanda.operacional@great.local' THEN 0 ELSE 1 END
  LIMIT 1
),
isaque_profile AS (
  SELECT id
  FROM public.profiles
  WHERE lower(email) = 'isaquegreatsd@gmail.com'
     OR lower(full_name) LIKE '%isaque%'
  ORDER BY CASE WHEN lower(email) = 'isaquegreatsd@gmail.com' THEN 0 ELSE 1 END
  LIMIT 1
),
input_rows AS (
  SELECT * FROM (VALUES
    ('fcac66bb-4720-412d-9d5f-d2d52d558582', 'Gabriela Montanhal', 'PARA_SUBIR', 'https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1776372072267-b8vqxnyx8hs.mov', '["https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1776372072267-b8vqxnyx8hs.mov", "https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1776372088387-uzdplmmxmy.mov"]'::jsonb, 'Amanda', NULL, NULL, '2026-04-16 20:41:33.735217+00'::timestamptz, '2026-04-16 20:41:33.735217+00'::timestamptz),
    ('506d4c37-2574-4e8d-8fc9-b80ec55892b6', 'CAMILA GOMES', 'PARA_SUBIR', 'https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1776363491902-hox9rf19qbo.mov', '["https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1776363491902-hox9rf19qbo.mov"]'::jsonb, 'Amanda', NULL, NULL, '2026-04-16 18:18:23.443556+00'::timestamptz, '2026-04-16 18:18:23.443556+00'::timestamptz),
    ('a187e80d-cdba-4406-b762-cd5a2c343abc', 'Marcela Nogueira', 'PARA_SUBIR', 'https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1776363389694-ste0x5gi8mh.mov', '["https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1776363389694-ste0x5gi8mh.mov", "https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1776363402125-wnwgcxxrcwk.mov", "https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1776363412159-nlr6tqbdos.mov"]'::jsonb, 'Amanda', NULL, NULL, '2026-04-16 18:16:58.988963+00'::timestamptz, '2026-04-16 18:16:58.988963+00'::timestamptz),
    ('06af2b8e-7f73-4233-8081-06aeb3ff92ba', 'REBECA RIBEIRO', 'PARA_SUBIR', 'https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1776363233527-gov1368g91v.mov', '["https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1776363233527-gov1368g91v.mov"]'::jsonb, 'Amanda', NULL, NULL, '2026-04-16 18:14:20.790488+00'::timestamptz, '2026-04-16 18:14:20.790488+00'::timestamptz),
    ('8ef9cb56-5d83-49e5-a52b-ad5abc7eabf5', 'Layana Cunha', 'PARA_SUBIR', 'https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1776342101831-lwed9d2bscl.mov', '["https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1776342101831-lwed9d2bscl.mov", "https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1776342108030-bbc57ovcmmi.mov"]'::jsonb, 'Amanda', NULL, NULL, '2026-04-16 12:21:54.923472+00'::timestamptz, '2026-04-16 12:21:54.923472+00'::timestamptz),
    ('afd0abe4-c74e-40f0-a2c7-b35640d82e75', 'Gabriela Montanhal', 'PARA_SUBIR', 'https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1776283182626-vjr06t2ijtd.mov', '["https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1776283182626-vjr06t2ijtd.mov", "https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1776283191589-cb0ep4zoire.mov"]'::jsonb, 'Amanda', NULL, NULL, '2026-04-15 19:59:57.141713+00'::timestamptz, '2026-04-15 19:59:57.141713+00'::timestamptz),
    ('d08fd330-b868-4b32-8f21-b858ed1204ec', 'Wiliane', 'PARA_SUBIR', 'https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1776267592129-dxr3thgut2w.mov', '["https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1776267592129-dxr3thgut2w.mov", "https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1776267612362-3sgxdon2la6.mov"]'::jsonb, 'Amanda', NULL, NULL, '2026-04-15 15:40:26.220471+00'::timestamptz, '2026-04-15 15:40:26.220471+00'::timestamptz),
    ('5afb3bf9-0e97-4f9b-a207-a8df51fc54ef', 'Cristiane Shimazu', 'PARA_SUBIR', 'https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1776262375585-sv3a86vlrpl.mov', '["https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1776262375585-sv3a86vlrpl.mov"]'::jsonb, 'Amanda', NULL, NULL, '2026-04-15 14:13:55.209095+00'::timestamptz, '2026-04-15 14:13:55.209095+00'::timestamptz),
    ('339c4d2d-26b1-45cf-a0ec-e0269dbc95d3', 'Dra Daniela Gouveia', 'ATIVO', 'https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1776102700674-imiv0zl8vcs.mov', '["https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1776102700674-imiv0zl8vcs.mov", "https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1776102716011-5eiahbz8py7.mov", "https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1776102729413-qw4sgv53enh.mov", "https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1776102742521-7jz4867j8n4.mov"]'::jsonb, 'Amanda', 'Isaque', '2026-04-13 21:28:06.363+00'::timestamptz, '2026-04-13 17:52:35.620901+00'::timestamptz, '2026-04-13 17:52:35.620901+00'::timestamptz),
    ('50cbbe36-b527-4906-a9f0-8708898fda7d', 'Marcos Brigagão', 'PARA_SUBIR', 'https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1776082887594-l27t7qm2xq.mov', '["https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1776082887594-l27t7qm2xq.mov", "https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1776082912827-l27abh69o6.mov"]'::jsonb, 'Amanda', NULL, NULL, '2026-04-13 12:22:15.552856+00'::timestamptz, '2026-04-13 12:22:15.552856+00'::timestamptz),
    ('258405a4-a954-4b4c-8a2d-5f66698a16e5', 'Instituto Corpo&Mente', 'PARA_SUBIR', 'https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1776082485660-5chmlvfgx9o.mov', '["https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1776082485660-5chmlvfgx9o.mov"]'::jsonb, 'Amanda', NULL, NULL, '2026-04-13 12:15:09.847279+00'::timestamptz, '2026-04-13 12:15:09.847279+00'::timestamptz),
    ('266cc434-f941-4c33-ac28-344b0f0dae34', 'CDC CAMPINAS', 'ATIVO', 'https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1775741248819-w6y0knn22gs.mov', '["https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1775741248819-w6y0knn22gs.mov", "https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1775741260919-5r0wvhqlp5v.mov", "https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1775741270003-jf2qia3qznr.mov"]'::jsonb, 'Amanda', 'Isaque', '2026-04-10 12:45:57.488+00'::timestamptz, '2026-04-09 13:28:04.233529+00'::timestamptz, '2026-04-09 13:28:04.233529+00'::timestamptz),
    ('fdf3bbd6-561b-4c1d-b663-30fca9392f3a', 'felipe queiroz', 'ATIVO', 'https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1775676007762-fucekm8melj.mov', '["https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1775676007762-fucekm8melj.mov", "https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1775676026291-2vs38yvtr6u.mov", "https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1775676044210-ekvovvvk1im.mov"]'::jsonb, 'Amanda', 'Isaque', '2026-04-10 14:04:29.202+00'::timestamptz, '2026-04-08 19:21:08.06708+00'::timestamptz, '2026-04-08 19:21:08.06708+00'::timestamptz),
    ('7f621f41-8607-40f3-8dd3-9cac139ac649', 'Bruna Baldissera', 'PARA_SUBIR', 'https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1775593527035-3x7hgta7efx.mov', '["https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1775593527035-3x7hgta7efx.mov"]'::jsonb, 'Amanda', NULL, NULL, '2026-04-07 20:25:31.636758+00'::timestamptz, '2026-04-07 20:25:31.636758+00'::timestamptz),
    ('2c43ad15-9dbd-4cf8-bf61-805592fc1060', 'Alanna', 'ATIVO', 'https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1775577961260-w4aoqleufm.mov', '["https://jcvmilqtmjyjynczwmlu.supabase.co/storage/v1/object/public/ad-creatives/1775577961260-w4aoqleufm.mov"]'::jsonb, 'Amanda', 'Isaque', '2026-04-10 14:46:16.655+00'::timestamptz, '2026-04-07 16:06:41.975231+00'::timestamptz, '2026-04-07 16:06:41.975231+00'::timestamptz)
  ) AS v(id, client_name, status, image_url, image_urls, created_by_name, completed_by_name, completed_at, created_at, updated_at)
),
resolved AS (
  SELECT
    r.id::uuid AS id,
    NULL::uuid AS client_id,
    r.client_name,
    r.status,
    r.image_url,
    r.image_urls,
    (SELECT id FROM amanda_profile) AS created_by_user_id,
    r.created_by_name,
    (SELECT id FROM isaque_profile) AS completed_by_user_id,
    r.completed_by_name,
    r.completed_at,
    r.created_at,
    r.updated_at
  FROM input_rows r
)
INSERT INTO public.ad_creatives (
  id,
  client_id,
  client_name,
  status,
  image_url,
  image_urls,
  created_by_user_id,
  created_by_name,
  completed_by_user_id,
  completed_by_name,
  completed_at,
  created_at,
  updated_at
)
SELECT
  id,
  client_id,
  client_name,
  status,
  image_url,
  image_urls,
  created_by_user_id,
  created_by_name,
  completed_by_user_id,
  completed_by_name,
  completed_at,
  created_at,
  updated_at
FROM resolved
ON CONFLICT (id) DO UPDATE SET
  client_id = EXCLUDED.client_id,
  client_name = EXCLUDED.client_name,
  status = EXCLUDED.status,
  image_url = EXCLUDED.image_url,
  image_urls = EXCLUDED.image_urls,
  created_by_user_id = EXCLUDED.created_by_user_id,
  created_by_name = EXCLUDED.created_by_name,
  completed_by_user_id = EXCLUDED.completed_by_user_id,
  completed_by_name = EXCLUDED.completed_by_name,
  completed_at = EXCLUDED.completed_at,
  updated_at = EXCLUDED.updated_at;

COMMIT;
