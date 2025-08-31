-- 1) Add email column and unique username on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique ON public.profiles (username);

-- 2) Storage policies for machine-documents bucket (admin-only manage)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Admins can manage machine documents'
  ) THEN
    CREATE POLICY "Admins can manage machine documents"
    ON storage.objects
    FOR ALL
    TO authenticated
    USING (
      bucket_id = 'machine-documents'
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
      )
    )
    WITH CHECK (
      bucket_id = 'machine-documents'
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
      )
    );
  END IF;
END $$;