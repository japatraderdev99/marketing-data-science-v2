
-- Create media_library table
CREATE TABLE public.media_library (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  url text NOT NULL,
  filename text NOT NULL,
  category text,
  tags text[],
  description text,
  file_size integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own media" ON public.media_library
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own media" ON public.media_library
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own media" ON public.media_library
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own media" ON public.media_library
  FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket for media library
INSERT INTO storage.buckets (id, name, public)
VALUES ('media-library', 'media-library', true);

-- Storage RLS policies
CREATE POLICY "Public read access on media-library"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media-library');

CREATE POLICY "Users can upload to own folder in media-library"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'media-library' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own files in media-library"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'media-library' AND auth.uid()::text = (storage.foldername(name))[1]);
