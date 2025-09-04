-- Fix CRITICAL privilege escalation vulnerability
-- Create security definer function to check admin role safely
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Drop the overly permissive update policy that allows role changes
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create restrictive update policies
-- Users can update only non-sensitive fields (username, email)
CREATE POLICY "Users can update their own non-sensitive profile fields"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND
  -- Prevent role changes by regular users
  role = (SELECT role FROM public.profiles WHERE user_id = auth.uid())
);

-- Admins can update any profile fields including roles
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());