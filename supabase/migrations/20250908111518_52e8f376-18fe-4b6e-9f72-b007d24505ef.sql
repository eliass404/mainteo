-- Create 'manuals' storage bucket and policies for admin uploads
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'manuals') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('manuals', 'manuals', false);
  END IF;
END $$;

-- Policies for storage.objects on 'manuals' bucket
-- Allow admins to view manuals
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can view manuals'
  ) THEN
    CREATE POLICY "Admins can view manuals"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'manuals' AND public.is_admin());
  END IF;
END $$;

-- Allow admins to upload manuals
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can upload manuals'
  ) THEN
    CREATE POLICY "Admins can upload manuals"
    ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'manuals' AND public.is_admin());
  END IF;
END $$;

-- Allow admins to update manuals
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can update manuals'
  ) THEN
    CREATE POLICY "Admins can update manuals"
    ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'manuals' AND public.is_admin());
  END IF;
END $$;

-- Allow admins to delete manuals
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can delete manuals'
  ) THEN
    CREATE POLICY "Admins can delete manuals"
    ON storage.objects
    FOR DELETE
    USING (bucket_id = 'manuals' AND public.is_admin());
  END IF;
END $$;
