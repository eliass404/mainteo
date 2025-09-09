-- Create policies for manual downloads by technicians
CREATE POLICY "Technicians can download manuals" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'manuals' AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'technicien'
  )
);

-- Allow admins to upload and manage manuals
CREATE POLICY "Admins can manage manuals" 
ON storage.objects 
FOR ALL 
USING (
  bucket_id = 'manuals' AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);