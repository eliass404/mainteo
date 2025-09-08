-- Ajouter une colonne pour stocker le contenu extrait des manuels PDF
ALTER TABLE public.machines 
ADD COLUMN manual_content text;