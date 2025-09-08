-- RESET COMPLET DE L'APPLICATION
-- Supprimer toutes les données existantes
TRUNCATE TABLE public.chat_messages CASCADE;
TRUNCATE TABLE public.intervention_reports CASCADE;
TRUNCATE TABLE public.machines CASCADE;
TRUNCATE TABLE public.profiles CASCADE;

-- Supprimer la colonne assigned_technician_id de la table machines
ALTER TABLE public.machines DROP COLUMN IF EXISTS assigned_technician_id;

-- Supprimer la colonne department de la table machines (plus de séparation par département)
ALTER TABLE public.machines DROP COLUMN IF EXISTS department;

-- Simplifier la structure des profils - seulement admin global et techniciens
-- Mettre à jour la contrainte sur le rôle
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'technicien'));

-- Supprimer les politiques RLS existantes pour les recréer
DROP POLICY IF EXISTS "Admins can manage machines" ON public.machines;
DROP POLICY IF EXISTS "Machines are viewable by authenticated users" ON public.machines;

-- Nouvelles politiques RLS pour les machines
-- L'admin peut tout faire
CREATE POLICY "Admin can manage all machines" 
ON public.machines 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Tous les techniciens peuvent voir toutes les machines
CREATE POLICY "Technicians can view all machines" 
ON public.machines 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'technicien'
));

-- Mise à jour des politiques pour les rapports d'intervention
DROP POLICY IF EXISTS "Admins can view all reports" ON public.intervention_reports;
DROP POLICY IF EXISTS "Technicians can view and manage their own reports" ON public.intervention_reports;

-- L'admin peut voir tous les rapports
CREATE POLICY "Admin can view all reports" 
ON public.intervention_reports 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Les techniciens peuvent créer et gérer leurs propres rapports
CREATE POLICY "Technicians can manage their own reports" 
ON public.intervention_reports 
FOR ALL 
USING (technician_id = auth.uid());

-- Création d'un compte admin global par défaut
-- Note: L'utilisateur devra créer ce compte via l'interface d'inscription