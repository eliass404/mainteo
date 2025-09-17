-- Create analytics table for tracking technician interactions with MAMAN
CREATE TABLE public.technician_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  technician_id UUID NOT NULL,
  machine_id TEXT NOT NULL,
  session_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_end TIMESTAMP WITH TIME ZONE,
  questions_count INTEGER NOT NULL DEFAULT 0,
  interaction_quality TEXT CHECK (interaction_quality IN ('bien', 'passable', 'mauvais')) DEFAULT 'passable',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.technician_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies for technician analytics
CREATE POLICY "Admins can view all analytics" 
ON public.technician_analytics 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "System can insert analytics" 
ON public.technician_analytics 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update analytics" 
ON public.technician_analytics 
FOR UPDATE 
USING (true);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_technician_analytics_updated_at
BEFORE UPDATE ON public.technician_analytics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();