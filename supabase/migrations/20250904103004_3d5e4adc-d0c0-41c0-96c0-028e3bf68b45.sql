-- Temporary fix: Remove admin policies to solve recursion immediately
-- Just keep the basic user policies for now
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins update all profiles" ON public.profiles;

-- Users can view their own profile (this works)
-- Users can update their own profile (this works)

-- Allow users to INSERT their own profile during signup
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);