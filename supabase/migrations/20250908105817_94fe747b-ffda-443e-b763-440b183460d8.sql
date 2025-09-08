-- Créer une table dédiée pour le statut en ligne des techniciens
CREATE TABLE public.technician_activity (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  last_seen timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.technician_activity ENABLE ROW LEVEL SECURITY;

-- Politique pour que les utilisateurs authentifiés puissent voir l'activité
CREATE POLICY "Authenticated users can view activity" 
ON public.technician_activity 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Politique pour que les utilisateurs peuvent mettre à jour leur propre activité
CREATE POLICY "Users can update their own activity" 
ON public.technician_activity 
FOR ALL 
USING (user_id = auth.uid());

-- Index pour optimiser les requêtes sur last_seen
CREATE INDEX idx_technician_activity_last_seen ON public.technician_activity(last_seen);
CREATE INDEX idx_technician_activity_user_id ON public.technician_activity(user_id);