-- Ajouter une colonne pour établir la hiérarchie admin -> techniciens
ALTER TABLE public.profiles 
ADD COLUMN created_by_admin_id uuid REFERENCES public.profiles(user_id);

-- Créer un index pour améliorer les performances
CREATE INDEX idx_profiles_created_by_admin ON public.profiles(created_by_admin_id);

-- Mettre à jour les policies RLS pour la hiérarchie

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "admins_can_view_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "admins_can_delete_profiles" ON public.profiles;
DROP POLICY IF EXISTS "admins_can_update_all_profile_fields" ON public.profiles;
DROP POLICY IF EXISTS "admins_can_insert_any_profile" ON public.profiles;

-- Nouvelles policies pour la hiérarchie
CREATE POLICY "admins_can_view_their_created_profiles" 
ON public.profiles 
FOR SELECT 
USING (
  is_admin() AND (
    created_by_admin_id = auth.uid() OR 
    user_id = auth.uid() OR
    created_by_admin_id IS NULL  -- Pour les admins créés avant cette migration
  )
);

CREATE POLICY "admins_can_insert_profiles_as_creator" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  is_admin() AND (
    created_by_admin_id = auth.uid() OR 
    (role = 'admin' AND created_by_admin_id IS NULL)  -- Permettre création d'autres admins
  )
);

CREATE POLICY "admins_can_update_their_created_profiles" 
ON public.profiles 
FOR UPDATE 
USING (
  is_admin() AND (
    created_by_admin_id = auth.uid() OR 
    user_id = auth.uid() OR
    created_by_admin_id IS NULL
  )
)
WITH CHECK (
  is_admin() AND (
    created_by_admin_id = auth.uid() OR 
    user_id = auth.uid() OR
    created_by_admin_id IS NULL
  )
);

CREATE POLICY "admins_can_delete_their_created_profiles" 
ON public.profiles 
FOR DELETE 
USING (
  is_admin() AND (
    created_by_admin_id = auth.uid() OR
    created_by_admin_id IS NULL
  )
);

-- Mettre à jour les policies pour les autres tables

-- Chat messages - seulement visibles par l'admin créateur et le technicien
DROP POLICY IF EXISTS "Admins can manage all chat messages" ON public.chat_messages;

CREATE POLICY "Admins can manage their technicians chat messages" 
ON public.chat_messages 
FOR ALL 
USING (
  technician_id = auth.uid() OR 
  (is_admin() AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = chat_messages.technician_id 
    AND created_by_admin_id = auth.uid()
  ))
)
WITH CHECK (
  technician_id = auth.uid() OR 
  (is_admin() AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = chat_messages.technician_id 
    AND created_by_admin_id = auth.uid()
  ))
);

-- Intervention reports - seulement visibles par l'admin créateur et le technicien
DROP POLICY IF EXISTS "Admin can view all reports" ON public.intervention_reports;
DROP POLICY IF EXISTS "Admins can delete any intervention report" ON public.intervention_reports;

CREATE POLICY "Admins can view their technicians reports" 
ON public.intervention_reports 
FOR SELECT 
USING (
  technician_id = auth.uid() OR 
  (is_admin() AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = intervention_reports.technician_id 
    AND created_by_admin_id = auth.uid()
  ))
);

CREATE POLICY "Admins can delete their technicians reports" 
ON public.intervention_reports 
FOR DELETE 
USING (
  is_admin() AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = intervention_reports.technician_id 
    AND created_by_admin_id = auth.uid()
  )
);

-- Technician activity - seulement visible par l'admin créateur et le technicien
DROP POLICY IF EXISTS "Admins can view all technician activity" ON public.technician_activity;

CREATE POLICY "Admins can view their technicians activity" 
ON public.technician_activity 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  (is_admin() AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = technician_activity.user_id 
    AND created_by_admin_id = auth.uid()
  ))
);