import { createClient } from 'jsr:@supabase/supabase-js@2';

/** Resolve workspace_id from the authenticated user's auth header. */
export async function resolveWorkspace(req: Request): Promise<{
  workspaceId: string;
  supabase: ReturnType<typeof createClient>;
} | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
  const { data: { user } } = await anonClient.auth.getUser(authHeader.replace('Bearer ', ''));
  if (!user) return null;

  // Get user's first workspace
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  if (!membership?.workspace_id) return null;

  return { workspaceId: membership.workspace_id, supabase };
}
