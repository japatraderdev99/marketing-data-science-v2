import { createClient } from 'jsr:@supabase/supabase-js@2';

const DB = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

/** Resolve userId from JWT auth header or body fallback. */
export async function getUserId(req: Request, bodyUserId?: string): Promise<string | null> {
  if (bodyUserId) return bodyUserId;
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

/**
 * Build a rich strategic context for AI prompt injection.
 * Priority 1: _metafields from generative_playbooks (AI-extracted, densest)
 * Priority 2: extracted_knowledge from strategy_knowledge KB docs
 */
export async function getStrategyContext(req: Request, bodyUserId?: string): Promise<string> {
  try {
    const db = DB();

    // 1. Try _metafields (richest — contains promptContext, toneRules, persona, etc.)
    const { data: playbook } = await db
      .from('generative_playbooks')
      .select('knowledge_json')
      .eq('playbook_type', 'copy')
      .limit(1)
      .maybeSingle();

    const kj = (playbook?.knowledge_json ?? {}) as Record<string, unknown>;
    const meta = kj._metafields as Record<string, unknown> | undefined;

    if (meta?.promptContext) return buildFromMetafields(meta, kj);

    // 2. Fallback: KB docs filtered by userId
    const userId = await getUserId(req, bodyUserId);
    if (!userId) return '';

    const { data: docs } = await db
      .from('strategy_knowledge')
      .select('extracted_knowledge, document_name')
      .eq('user_id', userId)
      .eq('status', 'done')
      .limit(5);

    if (!docs?.length) return '';
    return buildFromDocs(docs);
  } catch (e) {
    console.error('getStrategyContext error:', e);
    return '';
  }
}

function s(v: unknown): string { return v ? String(v) : ''; }
function arr(v: unknown): string[] { return Array.isArray(v) ? (v as string[]).filter(Boolean) : []; }

function buildFromMetafields(meta: Record<string, unknown>, kj: Record<string, unknown>): string {
  const lines: string[] = ['=== CONTEXTO ESTRATÉGICO DA MARCA ==='];

  // Parágrafo denso: tudo que a IA precisa saber sobre a marca
  lines.push(`BRIEF COMPLETO:\n${s(meta.promptContext)}`);

  // Proposta única de valor
  if (meta.uniqueValueProp) lines.push(`PROPOSTA ÚNICA: ${s(meta.uniqueValueProp)}`);

  // Persona detalhada para direcionar linguagem e dores
  const p = (meta.targetPersona ?? {}) as Record<string, string>;
  const personaParts = [
    p.profile && `Perfil: ${p.profile}`,
    p.biggestPain && `Maior dor: ${p.biggestPain}`,
    p.dream && `Sonho: ${p.dream}`,
    p.digitalBehavior && `Comportamento digital: ${p.digitalBehavior}`,
  ].filter(Boolean);
  if (personaParts.length) lines.push(`PERSONA: ${personaParts.join(' | ')}`);

  // Tom de voz como regras absolutas (DO / DON'T)
  const tone = (meta.toneRules ?? {}) as { use?: string[]; avoid?: string[] };
  if (tone.use?.length) lines.push(`TOM — USAR: ${tone.use.join(', ')}`);
  if (tone.avoid?.length) lines.push(`TOM — NUNCA USAR: ${tone.avoid.join(', ')}`);

  // Mensagens-chave da marca (alinhamento de narrativa)
  const msgs = arr(meta.keyMessages);
  if (msgs.length) lines.push(`MENSAGENS-CHAVE: ${msgs.join(' | ')}`);

  // Ângulos de conteúdo aprovados (para modo autônomo ou sugestão)
  const angles = arr(meta.contentAngles);
  if (angles.length) lines.push(`ÂNGULOS DE CONTEÚDO: ${angles.join(' | ')}`);

  // Diferenciais competitivos (para headlines e copy de proposta)
  const edge = arr(meta.competitiveEdge);
  if (edge.length) lines.push(`DIFERENCIAIS: ${edge.join(' | ')}`);

  // Dores do público (para ganchos de copy)
  const pains = arr(meta.painPoints);
  if (pains.length) lines.push(`DORES DO PÚBLICO: ${pains.join(' | ')}`);

  // Foco atual de campanha (para modo autônomo e contexto de momento)
  if (meta.currentCampaignFocus) lines.push(`FOCO DE CAMPANHA ATUAL: ${s(meta.currentCampaignFocus)}`);

  // Estilo de CTA padrão da marca
  if (meta.ctaStyle) lines.push(`ESTILO DE CTA: ${s(meta.ctaStyle)}`);

  // Posicionamento do playbook se não coberto por metafields
  if (!meta.uniqueValueProp && kj.positioning) lines.push(`POSICIONAMENTO: ${s(kj.positioning)}`);

  // Tópicos proibidos — restrição absoluta
  const forbidden = arr(meta.forbiddenTopics);
  if (forbidden.length) lines.push(`⛔ PROIBIDO ABSOLUTAMENTE: ${forbidden.join(', ')}`);

  lines.push('=== APLIQUE ESTE CONTEXTO EM CADA DETALHE DO CRIATIVO ===');
  return lines.join('\n\n');
}

function buildFromDocs(docs: Array<{ extracted_knowledge: Record<string, unknown> | null; document_name: string }>): string {
  const lines: string[] = ['=== CONTEXTO DA MARCA (Knowledge Base) ==='];
  const seen = new Set<string>();

  // Usa o primeiro promptContext como base
  for (const doc of docs) {
    const k = doc.extracted_knowledge;
    if (k?.promptContext) { lines.push(String(k.promptContext)); break; }
  }

  // Agrega campos únicos dos docs
  for (const doc of docs) {
    const k = doc.extracted_knowledge;
    if (!k) continue;
    const tone = k.toneOfVoice as { use?: string[]; avoid?: string[] } | undefined;
    if (tone?.use?.length) { const v = `TOM — USAR: ${tone.use.join(', ')}`; if (!seen.has(v)) { seen.add(v); lines.push(v); } }
    if (tone?.avoid?.length) { const v = `TOM — NUNCA USAR: ${tone.avoid.join(', ')}`; if (!seen.has(v)) { seen.add(v); lines.push(v); } }
    const msgs = arr(k.keyMessages);
    if (msgs.length) { const v = `MENSAGENS-CHAVE: ${msgs.join(' | ')}`; if (!seen.has(v)) { seen.add(v); lines.push(v); } }
    const forbidden = arr(k.forbiddenTopics);
    if (forbidden.length) { const v = `⛔ PROIBIDO: ${forbidden.join(', ')}`; if (!seen.has(v)) { seen.add(v); lines.push(v); } }
  }

  return lines.join('\n\n');
}
