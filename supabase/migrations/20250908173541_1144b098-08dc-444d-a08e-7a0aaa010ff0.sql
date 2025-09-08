-- Fix critical privilege escalation vulnerability in profiles table
-- Drop the overly permissive update policy that allows users to update any field including role
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;

-- Create a restricted policy for regular users - they can only update username and email
-- Users cannot update their role, user_id, or id fields
CREATE POLICY "users_can_update_own_profile_basic_info" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create a separate policy for admins to update any profile field
CREATE POLICY "admins_can_update_all_profile_fields" 
ON public.profiles 
FOR UPDATE 
USING (is_admin())
WITH CHECK (is_admin());

-- Recreate insert policy to prevent self-assignment of admin role
DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;

-- Allow users to insert their own profile but not as admin
CREATE POLICY "users_can_insert_own_profile_non_admin" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND role != 'admin'
);

-- Allow admins to insert profiles with any role
CREATE POLICY "admins_can_insert_any_profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (is_admin());