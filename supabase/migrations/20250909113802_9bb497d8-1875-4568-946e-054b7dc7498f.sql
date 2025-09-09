-- Delete existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Technicians can download manuals" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage manuals" ON storage.objects;

-- Create comprehensive policies for manual storage access
CREATE POLICY "Admins can upload manuals" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'manuals' AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update manuals" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'manuals' AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'manuals' AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete manuals" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'manuals' AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Technicians can download manuals" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'manuals' AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role IN ('technicien', 'admin')
  )
);

CREATE POLICY "Admins can view manuals" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'manuals' AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);