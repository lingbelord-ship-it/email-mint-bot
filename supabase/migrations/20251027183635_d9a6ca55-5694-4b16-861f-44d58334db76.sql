-- Allow public delete access to generated_emails table for testing
CREATE POLICY "Allow public delete to generated_emails"
ON public.generated_emails
FOR DELETE
TO public
USING (true);