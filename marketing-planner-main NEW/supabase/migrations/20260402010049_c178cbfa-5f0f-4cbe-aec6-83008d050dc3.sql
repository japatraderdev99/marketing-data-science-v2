
DROP POLICY IF EXISTS "Service role can manage reports" ON public.monthly_reports;
DROP POLICY IF EXISTS "Users can insert own reports" ON public.monthly_reports;

CREATE POLICY "Users can insert own reports"
  ON public.monthly_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access"
  ON public.monthly_reports FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
