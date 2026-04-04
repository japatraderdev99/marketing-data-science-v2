
-- Forum messages table
CREATE TABLE public.forum_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  author_name text NOT NULL,
  author_initials text NOT NULL DEFAULT '',
  author_role text NOT NULL DEFAULT '',
  content text NOT NULL,
  is_ai boolean NOT NULL DEFAULT false,
  is_pinned boolean NOT NULL DEFAULT false,
  message_type text NOT NULL DEFAULT 'message',
  -- message_type: 'message' | 'task_comment' | 'strategy_change' | 'goal_update' | 'system'
  metadata jsonb,
  -- metadata stores: { taskId, taskTitle, action, oldValue, newValue, approved_by }
  reply_to uuid REFERENCES public.forum_messages(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.forum_messages ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read all messages (team chat)
CREATE POLICY "Authenticated users can view all messages"
ON public.forum_messages FOR SELECT
TO authenticated
USING (true);

-- Users can insert their own messages
CREATE POLICY "Users can insert own messages"
ON public.forum_messages FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own messages
CREATE POLICY "Users can update own messages"
ON public.forum_messages FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages"
ON public.forum_messages FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Service role can insert AI messages (user_id = system UUID)
CREATE POLICY "Service role can insert AI messages"
ON public.forum_messages FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update messages"
ON public.forum_messages FOR UPDATE
TO service_role
USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_forum_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_forum_messages_updated_at
BEFORE UPDATE ON public.forum_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_forum_messages_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_messages;
