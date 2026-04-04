
CREATE TABLE public.monthly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  report_month date NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  extracted_data jsonb DEFAULT '{}'::jsonb,
  ai_analysis text,
  model_used text DEFAULT 'anthropic/claude-sonnet-4',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All team members can view reports"
  ON public.monthly_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own reports"
  ON public.monthly_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reports"
  ON public.monthly_reports FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage reports"
  ON public.monthly_reports FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
