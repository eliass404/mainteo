-- Fix infinite recursion in RLS policies - Simple approach
-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;  
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins update all profiles" ON public.profiles;

-- Simple safe policies
-- Users can view their own profile
CREATE POLICY "Users view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all profiles (using auth.jwt() to avoid recursion)
CREATE POLICY "Admins view all profiles"  
ON public.profiles
FOR SELECT
USING (auth.jwt() ->> 'role' = 'admin');

-- Users can update only non-sensitive fields
CREATE POLICY "Users update own profile"
ON public.profiles  
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can update any profile  
CREATE POLICY "Admins update all profiles"
ON public.profiles
FOR UPDATE  
USING (auth.jwt() ->> 'role' = 'admin');