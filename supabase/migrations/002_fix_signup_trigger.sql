-- ============================================================
-- PATCH: Fix handle_new_user trigger to never block signup
-- Run this in Supabase SQL Editor → it is safe to run multiple times.
-- ============================================================

-- 1. Replace the trigger function with a resilient version:
--    • ON CONFLICT DO NOTHING — suppresses conflicts on ANY unique column
--      (previously only handled conflict on `id`; username conflicts caused a fatal error)
--    • EXCEPTION WHEN OTHERS — catch-all so the trigger can never abort user creation
--    • SET search_path = '' — security best-practice for SECURITY DEFINER functions
--    • Explicit public. schema prefix — required when search_path is empty
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, username, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1))
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- 2. Add an INSERT policy so the service role (used by the API route) can always
--    upsert user_profiles without relying solely on the trigger.
--    (The SECURITY DEFINER trigger bypasses RLS, but the API route's service role
--     client also bypasses RLS — this policy is belt-and-suspenders.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'user_profiles'
      AND policyname = 'profiles_insert_service'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "profiles_insert_service" ON public.user_profiles
        FOR INSERT WITH CHECK (TRUE);
    $policy$;
  END IF;
END;
$$;
