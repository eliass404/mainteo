-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  username TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'technicien')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Profiles are viewable by authenticated users" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create machines table
CREATE TABLE public.machines (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  location TEXT NOT NULL,
  department TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('operational', 'maintenance', 'alert')) DEFAULT 'operational',
  description TEXT,
  serial_number TEXT,
  last_maintenance DATE,
  next_maintenance DATE,
  assigned_technician_id UUID REFERENCES public.profiles(user_id),
  manual_url TEXT,
  notice_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;

-- Create policies for machines
CREATE POLICY "Machines are viewable by authenticated users" 
ON public.machines 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage machines" 
ON public.machines 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create intervention reports table
CREATE TABLE public.intervention_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  machine_id TEXT NOT NULL REFERENCES public.machines(id),
  technician_id UUID NOT NULL REFERENCES public.profiles(user_id),
  description TEXT NOT NULL,
  actions TEXT,
  parts_used TEXT,
  time_spent DECIMAL,
  status TEXT NOT NULL CHECK (status IN ('en-cours', 'termine', 'brouillon')) DEFAULT 'en-cours',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.intervention_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for intervention reports
CREATE POLICY "Technicians can view and manage their own reports" 
ON public.intervention_reports 
FOR ALL 
USING (technician_id = auth.uid());

CREATE POLICY "Admins can view all reports" 
ON public.intervention_reports 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create chat messages table for AI conversations
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  machine_id TEXT NOT NULL REFERENCES public.machines(id),
  technician_id UUID NOT NULL REFERENCES public.profiles(user_id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for chat messages
CREATE POLICY "Technicians can view and create their own chat messages" 
ON public.chat_messages 
FOR ALL 
USING (technician_id = auth.uid());

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_machines_updated_at
BEFORE UPDATE ON public.machines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_intervention_reports_updated_at
BEFORE UPDATE ON public.intervention_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for PDF documents
INSERT INTO storage.buckets (id, name, public) VALUES ('machine-documents', 'machine-documents', false);

-- Create storage policies for machine documents
CREATE POLICY "Authenticated users can view machine documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'machine-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can upload machine documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'machine-documents' AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update machine documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'machine-documents' AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);