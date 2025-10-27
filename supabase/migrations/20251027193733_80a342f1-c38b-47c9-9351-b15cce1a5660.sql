-- Add tables for different word categories to generate more realistic emails
CREATE TABLE IF NOT EXISTS public.company_names (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sports_terms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  term TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.common_words (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_names ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.common_words ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access to company_names"
  ON public.company_names
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to company_names"
  ON public.company_names
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public read access to sports_terms"
  ON public.sports_terms
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to sports_terms"
  ON public.sports_terms
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public read access to common_words"
  ON public.common_words
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to common_words"
  ON public.common_words
  FOR INSERT
  WITH CHECK (true);

-- Insert sample data
INSERT INTO public.company_names (name) VALUES
  ('apple'), ('google'), ('microsoft'), ('amazon'), ('tesla'),
  ('netflix'), ('spotify'), ('uber'), ('airbnb'), ('meta'),
  ('twitter'), ('reddit'), ('discord'), ('slack'), ('zoom');

INSERT INTO public.sports_terms (term) VALUES
  ('soccer'), ('football'), ('basketball'), ('baseball'), ('tennis'),
  ('golf'), ('hockey'), ('racing'), ('gaming'), ('fitness'),
  ('runner'), ('player'), ('champion'), ('team'), ('sport');

INSERT INTO public.common_words (word) VALUES
  ('cool'), ('super'), ('pro'), ('best'), ('top'),
  ('king'), ('queen'), ('star'), ('fan'), ('tech'),
  ('digital'), ('smart'), ('fast'), ('boss'), ('ninja');