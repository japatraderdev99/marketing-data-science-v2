import { createClient } from 'jsr:@supabase/supabase-js@2';

/** Get the brand strategy context string for AI prompt injection. */
export async function getStrategyContext(req: Request): Promise<string> {
  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return '';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return '';

    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Get user's workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!membership?.workspace_id) return '';

    const { data: docs } = await supabase
      .from('strategy_knowledge')
      .select('extracted_knowledge')
      .eq('workspace_id', membership.workspace_id)
      .eq('status', 'done')
      .limit(3);

    if (!docs?.length) return '';
    return docs.map((d: { extracted_knowledge: Record<string, unknown> | null }) => {
      const k = d.extracted_knowledge;
      if (!k) return '';
      const parts: string[] = [];
      if (k.brandName) parts.push(`MARCA: ${k.brandName}`);
      if (k.brandEssence) parts.push(`ESSÊNCIA: ${k.brandEssence}`);
      if (k.positioning) parts.push(`POSICIONAMENTO: ${k.positioning}`);
      if (k.toneOfVoice) parts.push(`TOM: ${JSON.stringify(k.toneOfVoice)}`);
      if (k.promptContext) parts.push(`CONTEXTO: ${k.promptContext}`);
      return parts.join('\n');
    }).filter(Boolean).join('\n---\n');
  } catch { return ''; }
}

/** Extract user_id from the auth header. */
export async function getUserId(req: Request): Promise<string | null> {
  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return null;
    const c = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await c.auth.getUser();
    return user?.id ?? null;
  } catch { return null; }
}
