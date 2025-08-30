-- Update the current user's profile to admin role
-- This will give immediate admin access to the user who registered
UPDATE profiles 
SET role = 'admin' 
WHERE role = 'technicien' 
ORDER BY created_at ASC 
LIMIT 1;