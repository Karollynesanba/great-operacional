-- Keep profile emails globally unique so the same account resolves across servers.

UPDATE public.profiles
SET email = LOWER(email)
WHERE email <> LOWER(email);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_lower_unique_idx
ON public.profiles (LOWER(email));
