-- Allow admins to delete profiles safely
DROP POLICY IF EXISTS "admins_can_delete_profiles" ON public.profiles;

CREATE POLICY "admins_can_delete_profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (public.is_admin());