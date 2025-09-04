-- Clean reset of RLS policies on public.profiles to fix recursion
DO $$
DECLARE r record;
BEGIN
  FOR r IN (
    SELECT polname FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.polname);
  END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Minimal, safe policies (no subqueries on profiles)
CREATE POLICY profiles_select_self
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY profiles_insert_self
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY profiles_update_self
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);