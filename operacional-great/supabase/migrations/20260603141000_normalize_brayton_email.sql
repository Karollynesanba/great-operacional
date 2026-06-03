BEGIN;

DO $$
DECLARE
  v_old_profile uuid;
  v_new_profile uuid;
  v_temp_email text := 'braytonmaycon5+tmp-' || to_char(now(), 'YYYYMMDDHH24MISS') || '@gmail.com';
BEGIN
  SELECT id
  INTO v_old_profile
  FROM public.profiles
  WHERE lower(email) = lower('brayton.operacional@great.local')
  LIMIT 1;

  SELECT id
  INTO v_new_profile
  FROM public.profiles
  WHERE lower(email) = lower('braytonmaycon5@gmail.com')
  LIMIT 1;

  IF v_old_profile IS NOT NULL THEN
    IF v_new_profile IS NOT NULL AND v_new_profile <> v_old_profile THEN
      UPDATE public.profiles
      SET email = v_temp_email,
          updated_at = now()
      WHERE id = v_new_profile;
    END IF;

    UPDATE public.profiles
    SET email = 'braytonmaycon5@gmail.com',
        updated_at = now()
    WHERE id = v_old_profile;
  END IF;
END $$;

DO $$
DECLARE
  v_old_user uuid;
  v_new_user uuid;
  v_temp_email text := 'braytonmaycon5+tmp-' || to_char(now(), 'YYYYMMDDHH24MISS') || '@gmail.com';
BEGIN
  SELECT id
  INTO v_old_user
  FROM auth.users
  WHERE lower(email) = lower('brayton.operacional@great.local')
  LIMIT 1;

  SELECT id
  INTO v_new_user
  FROM auth.users
  WHERE lower(email) = lower('braytonmaycon5@gmail.com')
  LIMIT 1;

  IF v_old_user IS NOT NULL THEN
    IF v_new_user IS NOT NULL AND v_new_user <> v_old_user THEN
      UPDATE auth.users
      SET email = v_temp_email,
          updated_at = now()
      WHERE id = v_new_user;
    END IF;

    UPDATE auth.users
    SET email = 'braytonmaycon5@gmail.com',
        updated_at = now()
    WHERE id = v_old_user;
  END IF;
END $$;

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;

COMMIT;
