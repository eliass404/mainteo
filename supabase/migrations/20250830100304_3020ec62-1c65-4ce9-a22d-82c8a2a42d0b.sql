-- Update the first technician profile to admin role
UPDATE profiles 
SET role = 'admin' 
WHERE id = (
  SELECT id 
  FROM profiles 
  WHERE role = 'technicien' 
  ORDER BY created_at ASC 
  LIMIT 1
);