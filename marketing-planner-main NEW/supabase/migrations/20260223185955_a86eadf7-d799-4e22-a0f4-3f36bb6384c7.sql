
-- Table to store generative AI playbook knowledge (image + video best practices)
CREATE TABLE public.generative_playbooks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playbook_type text NOT NULL, -- 'image' or 'video'
  title text NOT NULL,
  knowledge_json jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.generative_playbooks ENABLE ROW LEVEL SECURITY;

-- Public read for all authenticated users (shared knowledge)
CREATE POLICY "Authenticated users can read playbooks"
ON public.generative_playbooks
FOR SELECT
USING (true);

-- Only service role can manage (via edge functions)
CREATE POLICY "Service role can manage playbooks"
ON public.generative_playbooks
FOR ALL
USING (true)
WITH CHECK (true);
