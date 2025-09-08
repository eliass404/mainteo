-- Fix critical privilege escalation vulnerability in profiles table
-- Drop the overly permissive update policy that allows users to update any field including role
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;

-- Create a restricted policy for regular users - they can only update username and email
CREATE POLICY "users_can_update_own_profile_basic_info" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id 
  AND OLD.role = NEW.role  -- Prevent role changes
  AND OLD.user_id = NEW.user_id  -- Prevent user_id changes
  AND OLD.id = NEW.id  -- Prevent id changes
);

-- Create a separate policy for admins to update roles and other sensitive fields
CREATE POLICY "admins_can_update_all_profile_fields" 
ON public.profiles 
FOR UPDATE 
USING (is_admin())
WITH CHECK (is_admin());

-- Add a policy to prevent users from inserting profiles with admin roles
DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
CREATE POLICY "users_can_insert_own_profile_non_admin" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND role != 'admin'  -- Prevent self-assignment of admin role
);

-- Allow admins to insert profiles with any role
CREATE POLICY "admins_can_insert_any_profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (is_admin());