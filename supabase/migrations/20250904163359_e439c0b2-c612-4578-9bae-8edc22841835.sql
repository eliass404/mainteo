
-- Fix RLS recursion on profiles by using a SECURITY DEFINER helper

-- 1) Drop the problematic recursive policy
DROP POLICY IF EXISTS "admins_can_view_all_profiles" ON public.profiles;

-- 2) Recreate an admin-select policy that relies on the definer function
-- Note: public.is_admin() already exists and safely checks the caller's role
CREATE POLICY "admins_can_view_all_profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin());
