-- Policies for manuals bucket
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can manage manuals'
  ) THEN
    CREATE POLICY "Admins can manage manuals"
      ON storage.objects
      FOR ALL
      USING (bucket_id = 'manuals' AND public.is_admin())
      WITH CHECK (bucket_id = 'manuals' AND public.is_admin());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can read manuals'
  ) THEN
    CREATE POLICY "Admins can read manuals"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'manuals' AND public.is_admin());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Technicians can read manuals'
  ) THEN
    CREATE POLICY "Technicians can read manuals"
      ON storage.objects
      FOR SELECT
      USING (
        bucket_id = 'manuals'
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = auth.uid() AND p.role = 'technicien'
        )
      );
  END IF;
END $$;