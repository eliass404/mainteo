-- Fix admin policies to work correctly
-- Drop the JWT-based admin policies that won't work
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins update all profiles" ON public.profiles;

-- Create a security definer function that avoids recursion
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
  DECLARE
    user_role TEXT;
  BEGIN
    SELECT role INTO user_role 
    FROM public.profiles 
    WHERE user_id = auth.uid()
    LIMIT 1;
    
    RETURN COALESCE(user_role, 'technicien');
  END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Now create admin policies using the function
CREATE POLICY "Admins view all profiles"
ON public.profiles
FOR SELECT
USING (auth.user_role() = 'admin');

CREATE POLICY "Admins update all profiles"  
ON public.profiles
FOR UPDATE
USING (auth.user_role() = 'admin');