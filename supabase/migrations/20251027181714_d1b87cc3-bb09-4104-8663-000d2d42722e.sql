-- Create a table to store generation logs for real-time updates
CREATE TABLE IF NOT EXISTS public.generation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL, -- 'testing', 'success', 'failed'
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.generation_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for generation_logs
CREATE POLICY "Allow public read access to generation_logs" 
ON public.generation_logs 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert to generation_logs" 
ON public.generation_logs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public delete to generation_logs" 
ON public.generation_logs 
FOR DELETE 
USING (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_generation_logs_session ON public.generation_logs(session_id, created_at DESC);

-- Enable realtime for generation_logs
ALTER TABLE public.generation_logs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.generation_logs;