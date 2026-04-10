import { createClient } from 'jsr:@supabase/supabase-js@2';

/** Resolve user_id from the authenticated request's Authorization header. */
export async function resolveWorkspace(req: Request): Promise<{
  userId: string;
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

  return { userId: user.id, supabase };
}
