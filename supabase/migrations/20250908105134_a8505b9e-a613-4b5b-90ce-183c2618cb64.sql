-- RESET COMPLET DE TOUTE LA BASE DE DONNÉES
-- Supprimer toutes les données des tables
TRUNCATE TABLE public.chat_messages CASCADE;
TRUNCATE TABLE public.intervention_reports CASCADE;
TRUNCATE TABLE public.machines CASCADE;
TRUNCATE TABLE public.profiles CASCADE;

-- Supprimer tous les objets du storage (manuels et notices)
DELETE FROM storage.objects WHERE bucket_id = 'machine-documents';

-- Note: Pour supprimer complètement les utilisateurs de l'authentification,
-- cela doit être fait manuellement via l'interface Supabase ou via l'API admin
-- car nous ne pouvons pas supprimer directement depuis auth.users via SQL

-- Réinitialiser les séquences si nécessaire
-- (Pas nécessaire ici car nous utilisons des UUID)

-- Optionnel: Vider les logs de chat si ils existent
-- TRUNCATE TABLE IF EXISTS chat_logs CASCADE;