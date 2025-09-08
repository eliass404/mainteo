-- Drop the overly permissive policy that allows all authenticated users to view all technician activity
DROP POLICY IF EXISTS "Authenticated users can view activity" ON public.technician_activity;

-- Create a new policy that only allows technicians to see their own activity
CREATE POLICY "Technicians can view their own activity" 
ON public.technician_activity 
FOR SELECT 
USING (user_id = auth.uid());

-- Create a policy that allows admins to view all technician activity for management purposes
CREATE POLICY "Admins can view all technician activity" 
ON public.technician_activity 
FOR SELECT 
USING (is_admin());