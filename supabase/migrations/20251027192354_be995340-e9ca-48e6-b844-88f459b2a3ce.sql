-- Create table for stop signals
CREATE TABLE IF NOT EXISTS public.generation_stop_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.generation_stop_signals ENABLE ROW LEVEL SECURITY;

-- Allow public access to stop signals
CREATE POLICY "Allow public insert to stop signals"
  ON public.generation_stop_signals
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public read to stop signals"
  ON public.generation_stop_signals
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public delete to stop signals"
  ON public.generation_stop_signals
  FOR DELETE
  USING (true);