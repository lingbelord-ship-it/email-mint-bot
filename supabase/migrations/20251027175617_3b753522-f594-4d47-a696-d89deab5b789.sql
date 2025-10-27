-- Create table for storing real first and last names
CREATE TABLE IF NOT EXISTS public.names (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name text NOT NULL,
  last_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create table for generated emails
CREATE TABLE IF NOT EXISTS public.generated_emails (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  is_verified boolean DEFAULT false,
  is_deliverable boolean DEFAULT false,
  verification_status text,
  created_at timestamptz DEFAULT now(),
  verified_at timestamptz
);

-- Create table for tracking daily generation limits
CREATE TABLE IF NOT EXISTS public.daily_generation_tracking (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  generation_date date DEFAULT CURRENT_DATE UNIQUE,
  emails_generated integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.names ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_generation_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (since this is a public-facing feature)
CREATE POLICY "Allow public read access to names" ON public.names FOR SELECT USING (true);
CREATE POLICY "Allow public insert to names" ON public.names FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access to generated_emails" ON public.generated_emails FOR SELECT USING (true);
CREATE POLICY "Allow public insert to generated_emails" ON public.generated_emails FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to generated_emails" ON public.generated_emails FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to tracking" ON public.daily_generation_tracking FOR SELECT USING (true);
CREATE POLICY "Allow public insert to tracking" ON public.daily_generation_tracking FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to tracking" ON public.daily_generation_tracking FOR UPDATE USING (true);

-- Insert sample real names dataset
INSERT INTO public.names (first_name, last_name) VALUES
('James', 'Smith'), ('Michael', 'Johnson'), ('Robert', 'Williams'), ('John', 'Brown'), ('David', 'Jones'),
('William', 'Garcia'), ('Richard', 'Miller'), ('Joseph', 'Davis'), ('Thomas', 'Rodriguez'), ('Christopher', 'Martinez'),
('Charles', 'Hernandez'), ('Daniel', 'Lopez'), ('Matthew', 'Gonzalez'), ('Anthony', 'Wilson'), ('Mark', 'Anderson'),
('Donald', 'Thomas'), ('Steven', 'Taylor'), ('Andrew', 'Moore'), ('Paul', 'Jackson'), ('Joshua', 'Martin'),
('Kenneth', 'Lee'), ('Kevin', 'Perez'), ('Brian', 'Thompson'), ('George', 'White'), ('Timothy', 'Harris'),
('Mary', 'Smith'), ('Patricia', 'Johnson'), ('Jennifer', 'Williams'), ('Linda', 'Brown'), ('Barbara', 'Jones'),
('Elizabeth', 'Garcia'), ('Susan', 'Miller'), ('Jessica', 'Davis'), ('Sarah', 'Rodriguez'), ('Karen', 'Martinez'),
('Lisa', 'Hernandez'), ('Nancy', 'Lopez'), ('Betty', 'Gonzalez'), ('Helen', 'Wilson'), ('Sandra', 'Anderson'),
('Donna', 'Thomas'), ('Carol', 'Taylor'), ('Ruth', 'Moore'), ('Sharon', 'Jackson'), ('Michelle', 'Martin'),
('Laura', 'Lee'), ('Sarah', 'Perez'), ('Kimberly', 'Thompson'), ('Deborah', 'White'), ('Jessica', 'Harris'),
('Emily', 'Clark'), ('Emma', 'Lewis'), ('Olivia', 'Robinson'), ('Ava', 'Walker'), ('Sophia', 'Young'),
('Isabella', 'Allen'), ('Mia', 'King'), ('Charlotte', 'Wright'), ('Amelia', 'Scott'), ('Harper', 'Torres'),
('Evelyn', 'Nguyen'), ('Abigail', 'Hill'), ('Emily', 'Flores'), ('Madison', 'Green'), ('Sofia', 'Adams'),
('Liam', 'Nelson'), ('Noah', 'Baker'), ('Oliver', 'Hall'), ('Elijah', 'Rivera'), ('Lucas', 'Campbell'),
('Mason', 'Mitchell'), ('Logan', 'Carter'), ('Alexander', 'Roberts'), ('Ethan', 'Gomez'), ('Jacob', 'Phillips'),
('Michael', 'Evans'), ('Benjamin', 'Turner'), ('William', 'Diaz'), ('James', 'Parker'), ('Aiden', 'Cruz'),
('Daniel', 'Edwards'), ('Henry', 'Collins'), ('Jackson', 'Reyes'), ('Sebastian', 'Stewart'), ('Jack', 'Morris');

-- Create index for faster lookups
CREATE INDEX idx_generated_emails_email ON public.generated_emails(email);
CREATE INDEX idx_generation_tracking_date ON public.daily_generation_tracking(generation_date);