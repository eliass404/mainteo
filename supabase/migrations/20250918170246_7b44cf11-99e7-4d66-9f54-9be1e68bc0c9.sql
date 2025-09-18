-- Create machine families table
CREATE TABLE public.machine_families (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.machine_families ENABLE ROW LEVEL SECURITY;

-- Create policies for machine families
CREATE POLICY "Admin can manage all machine families" 
ON public.machine_families 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Technicians can view all machine families" 
ON public.machine_families 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'technicien'
));

-- Add family_id to machines table
ALTER TABLE public.machines 
ADD COLUMN family_id uuid REFERENCES public.machine_families(id);

-- Create maintenance notifications table
CREATE TABLE public.maintenance_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  machine_id text NOT NULL REFERENCES public.machines(id),
  message text NOT NULL,
  notification_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.maintenance_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for maintenance notifications
CREATE POLICY "Admin can manage all notifications" 
ON public.maintenance_notifications 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Technicians can view active notifications" 
ON public.maintenance_notifications 
FOR SELECT 
USING (is_active = true AND EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'technicien'
));

-- Create trigger for automatic timestamp updates on machine families
CREATE TRIGGER update_machine_families_updated_at
BEFORE UPDATE ON public.machine_families
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for automatic timestamp updates on maintenance notifications
CREATE TRIGGER update_maintenance_notifications_updated_at
BEFORE UPDATE ON public.maintenance_notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically create maintenance notifications
CREATE OR REPLACE FUNCTION public.check_maintenance_due()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete existing notifications for this machine
  DELETE FROM public.maintenance_notifications 
  WHERE machine_id = NEW.id;
  
  -- Create new notification if next_maintenance is set and in the future
  IF NEW.next_maintenance IS NOT NULL AND NEW.next_maintenance >= CURRENT_DATE THEN
    INSERT INTO public.maintenance_notifications (machine_id, message, notification_date)
    VALUES (
      NEW.id,
      'Maintenance programmée pour la machine ' || NEW.name || ' (' || NEW.serial_number || ')',
      NEW.next_maintenance
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for maintenance notifications
CREATE TRIGGER trigger_check_maintenance_due
AFTER INSERT OR UPDATE ON public.machines
FOR EACH ROW
EXECUTE FUNCTION public.check_maintenance_due();