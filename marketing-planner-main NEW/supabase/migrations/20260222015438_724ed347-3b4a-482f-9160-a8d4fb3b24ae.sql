
-- Tabela de log de uso de IA para controle de custos
CREATE TABLE public.ai_usage_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  function_name text NOT NULL,
  task_type text NOT NULL,
  model_used text NOT NULL,
  provider text NOT NULL DEFAULT 'openrouter',
  tokens_input integer DEFAULT 0,
  tokens_output integer DEFAULT 0,
  cost_estimate numeric DEFAULT 0,
  latency_ms integer DEFAULT 0,
  success boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage logs"
  ON public.ai_usage_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage logs"
  ON public.ai_usage_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role tambem pode inserir (para edge functions)
CREATE POLICY "Service role can insert usage logs"
  ON public.ai_usage_log FOR INSERT
  WITH CHECK (true);

-- Index para queries de analytics
CREATE INDEX idx_ai_usage_log_user_created ON public.ai_usage_log (user_id, created_at DESC);
CREATE INDEX idx_ai_usage_log_task_type ON public.ai_usage_log (task_type);

-- Tabela de cache do DAM (Google Drive)
CREATE TABLE public.dam_assets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  drive_file_id text NOT NULL,
  filename text NOT NULL,
  mime_type text,
  thumbnail_url text,
  download_url text,
  folder_path text,
  category text,
  tags text[] DEFAULT '{}'::text[],
  description text,
  file_size integer,
  synced_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.dam_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own DAM assets"
  ON public.dam_assets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own DAM assets"
  ON public.dam_assets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own DAM assets"
  ON public.dam_assets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own DAM assets"
  ON public.dam_assets FOR DELETE
  USING (auth.uid() = user_id);

-- Service role pode gerenciar DAM assets (para sync via edge function)
CREATE POLICY "Service role can manage DAM assets"
  ON public.dam_assets FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index para buscas rapidas
CREATE INDEX idx_dam_assets_drive_file ON public.dam_assets (drive_file_id);
CREATE INDEX idx_dam_assets_category ON public.dam_assets (category);
CREATE INDEX idx_dam_assets_user ON public.dam_assets (user_id);
