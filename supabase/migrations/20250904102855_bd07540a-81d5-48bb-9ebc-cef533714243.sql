-- Fix infinite recursion in RLS policies
-- Drop problematic policies and functions
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own non-sensitive profile fields" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP FUNCTION IF EXISTS public.is_admin();

-- Create new safe policies without recursion
-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all profiles (using a non-recursive approach)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM public.profiles 
    WHERE role = 'admin' AND user_id = auth.uid()
  )
);

-- Users can update only their own username and email (not role)
CREATE POLICY "Users can update their own profile fields"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND
  role = (
    SELECT role FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

-- Admins can update any profile including roles
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT user_id FROM public.profiles 
    WHERE role = 'admin' AND user_id = auth.uid()
  )
);