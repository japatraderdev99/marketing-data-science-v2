
-- Knowledge base table: stores brand book documents + AI-extracted fields
CREATE TABLE public.strategy_knowledge (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  document_name text NOT NULL,
  document_url text NOT NULL,
  document_type text,
  file_size integer,
  status text NOT NULL DEFAULT 'pending', -- pending | analyzing | done | error
  extracted_knowledge jsonb,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.strategy_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own knowledge"
  ON public.strategy_knowledge FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own knowledge"
  ON public.strategy_knowledge FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own knowledge"
  ON public.strategy_knowledge FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own knowledge"
  ON public.strategy_knowledge FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_strategy_knowledge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_strategy_knowledge_updated_at
  BEFORE UPDATE ON public.strategy_knowledge
  FOR EACH ROW
  EXECUTE FUNCTION public.update_strategy_knowledge_updated_at();
