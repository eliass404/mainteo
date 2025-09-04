-- Fix chat_messages role constraint to allow system role
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_role_check;

-- Add updated constraint that includes system role for online tracking
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_role_check 
  CHECK (role IN ('user', 'assistant', 'system'));