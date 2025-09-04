-- Fix chat_messages role constraint and clean up data
-- 1. Drop the existing check constraint that's causing issues
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_role_check;

-- 2. Add correct check constraint for role
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_role_check 
  CHECK (role IN ('user', 'assistant'));

-- 3. Clean up duplicate profiles (keep the one with the earliest created_at for each user_id)
WITH duplicates AS (
  SELECT user_id, MIN(created_at) as earliest_created_at
  FROM public.profiles
  GROUP BY user_id
  HAVING COUNT(*) > 1
)
DELETE FROM public.profiles p1
WHERE EXISTS (
  SELECT 1 FROM duplicates d
  WHERE d.user_id = p1.user_id 
  AND p1.created_at > d.earliest_created_at
);

-- 4. Ensure we have proper indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_chat_messages_machine_technician ON public.chat_messages(machine_id, technician_id);

-- 5. Update any existing invalid role data in chat_messages if any
DELETE FROM public.chat_messages WHERE role NOT IN ('user', 'assistant');