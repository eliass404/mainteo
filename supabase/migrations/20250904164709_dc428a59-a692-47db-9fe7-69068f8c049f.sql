-- Allow admins to delete profiles safely
CREATE POLICY IF NOT EXISTS "admins_can_delete_profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (public.is_admin());