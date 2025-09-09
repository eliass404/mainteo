-- Mise à jour des techniciens existants pour les lier à l'admin actuel
UPDATE profiles 
SET created_by_admin_id = '444d5143-9f15-4761-b3f8-7c25cf18aadf'
WHERE role = 'technicien' AND created_by_admin_id IS NULL;