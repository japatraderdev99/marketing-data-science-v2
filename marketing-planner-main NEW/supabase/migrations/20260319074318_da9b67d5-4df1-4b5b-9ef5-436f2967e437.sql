
CREATE TABLE public.operational_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  metric_type TEXT NOT NULL,
  metric_date DATE NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  total_value NUMERIC DEFAULT 0,
  city TEXT,
  state TEXT,
  metadata JSONB DEFAULT '{}',
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.operational_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own operational metrics" ON public.operational_metrics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own operational metrics" ON public.operational_metrics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own operational metrics" ON public.operational_metrics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own operational metrics" ON public.operational_metrics FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage operational metrics" ON public.operational_metrics FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_operational_metrics_user_type ON public.operational_metrics(user_id, metric_type);
CREATE INDEX idx_operational_metrics_date ON public.operational_metrics(metric_date);
