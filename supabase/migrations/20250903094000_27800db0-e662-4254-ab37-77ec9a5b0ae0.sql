-- Fix the function by setting search_path properly
CREATE OR REPLACE FUNCTION public.sync_user_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the profile with the user's email when auth user is updated
  UPDATE public.profiles
  SET email = NEW.email
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;