-- Recréer le bucket machine-documents pour stocker les manuels et notices PDF
INSERT INTO storage.buckets (id, name, public) 
VALUES ('machine-documents', 'machine-documents', false);

-- Politiques pour permettre aux utilisateurs authentifiés de télécharger des fichiers
CREATE POLICY "Authenticated users can upload files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'machine-documents' AND auth.uid() IS NOT NULL);

-- Politiques pour permettre aux utilisateurs authentifiés de voir les fichiers
CREATE POLICY "Authenticated users can view files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'machine-documents' AND auth.uid() IS NOT NULL);

-- Politiques pour permettre aux admins de supprimer des fichiers
CREATE POLICY "Admins can delete files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'machine-documents' AND EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));