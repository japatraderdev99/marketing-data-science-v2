import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function extractJSON(raw: string): Record<string, unknown> {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/```json\s*/gi, '').replace(/```\s*/gi, '');
  try { return JSON.parse(cleaned); } catch { /* continue */ }
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch { /* continue */ }
  }
  throw new Error('No valid JSON found in AI response');
}

async function getStrategyContext(req: Request, strategyContext?: string): Promise<string> {
  const base = strategyContext ? `\nCONTEXTO ESTRATÉGICO:\n${strategyContext}\n` : '';
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return base;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return base;
    const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: docs } = await supabase
      .from("strategy_knowledge")
      .select("document_name, extracted_knowledge")
      .eq("user_id", user.id)
      .eq("status", "done")
      .limit(3);
    if (!docs?.length) return base;
    const ctx = docs.map((d: any) => {
      const k = d.extracted_knowledge;
      if (!k) return "";
      const parts: string[] = [];
      if (k.brandName) parts.push(`MARCA: ${k.brandName}`);
      if (k.brandEssence) parts.push(`ESSÊNCIA: ${k.brandEssence}`);
      if (k.positioning) parts.push(`POSICIONAMENTO: ${k.positioning}`);
      if (k.uniqueValueProp) parts.push(`PROPOSTA DE VALOR: ${k.uniqueValueProp}`);
      if (k.toneOfVoice) parts.push(`TOM DE VOZ: ${JSON.stringify(k.toneOfVoice)}`);
      if (Array.isArray(k.keyMessages)) parts.push(`MENSAGENS: ${k.keyMessages.join(" | ")}`);
      if (k.promptContext) parts.push(`SYSTEM PROMPT: ${k.promptContext}`);
      return parts.join("\n");
    }).filter(Boolean).join("\n---\n");
    return ctx ? `\nKNOWLEDGE BASE DA MARCA:\n${ctx}\n${base}` : base;
  } catch { return base; }
}

async function getUserId(req: Request): Promise<string | null> {
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return null;
    const c = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await c.auth.getUser();
    return user?.id ?? null;
  } catch { return null; }
}

const NARRATIVE_RULES = `
VOCÊ É UM ESTRATEGISTA DE CONTEÚDO NARRATIVO para a Deixa Que Eu Faço (DQEF).
Sua missão é criar CARROSSÉIS NARRATIVOS — conteúdo editorial profundo, com storytelling que prende a atenção slide a slide.

REFERÊNCIA VISUAL: Pense em carrosséis editoriais do estilo ETER Brasil, Meio & Mensagem, The Futur — onde cada slide é uma lâmina visual impactante com imagem full-bleed, tipografia bold e narrativa que faz o leitor percorrer TODOS os slides.

DIFERENÇA DO CARROSSEL PADRÃO:
- Carrossel Padrão DQEF: 5 slides diretos, foco em CTA rápido, copy curta
- Carrossel Narrativo: 7-10 slides, storytelling profundo, dados com fontes, transições emocionais, conteúdo que gera SAVE e SHARE por ser informativo e conectado com desejos da audiência

ESTRUTURA NARRATIVA OBRIGATÓRIA (arco de 7-10 slides):
1. HOOK (slide 1): Pergunta provocativa ou afirmação chocante que para o scroll. Imagem impactante full-bleed.
2-3. CONTEXTO: Estabelece o cenário, traz dados históricos ou culturais com fontes reais.
4-5. TENSÃO/DADOS: Apresenta o problema ou contraste com números e pesquisas citadas.
6-7. VIRADA: O insight principal, a mudança de perspectiva.
8-9. PROVA/EVIDÊNCIA: Exemplos concretos, cases, dados que validam a virada.
10. CTA: Fechamento emocional + chamada para ação.

REGRAS DE COPY NARRATIVA:
- Mistura de headlines BOLD em caixa alta (máx 8 palavras) com parágrafos explicativos em caixa normal
- Dados SEMPRE com fonte verificável: "(Nome da Fonte, Ano)". Use SOMENTE fontes reais e verificáveis (ex: IBGE, Pew Research, McKinsey, Harvard Business Review). Se não encontrar uma fonte real, marque como "~estimativa" e NÃO invente nomes de institutos ou pesquisas fictícias.
- Destaque com **negrito** em palavras-chave dentro dos parágrafos
- Cada slide deve ter um "gancho de passagem" que faça o leitor querer ver o próximo
- Tom editorial-informativo mas acessível — como um amigo inteligente explicando algo complexo
- O conteúdo deve ser COMPARTILHÁVEL: algo que a pessoa sente que "precisa mostrar para os amigos"
- Conectar o tema com os DESEJOS e INTERESSES do público-alvo da DQEF

REGRAS DE LAYOUT POR TIPO:
- "full-image": Imagem ocupa toda a lâmina, texto overlay com gradient. Usado para hook e slides visuais.
- "split": Metade texto, metade imagem. Usado para slides com mais copy.
- "text-heavy": Fundo sólido/gradient, texto domina com stats destacados. Usado para dados.
- "quote": Citação grande centralizada com atribuição. Usado para insights.
- "cta": Fechamento visual com marca e call-to-action.

REGRAS VISUAIS:
- imagePrompt em INGLÊS, mínimo 60 palavras, ultra-detalhado
- REGRA CRÍTICA: O imagePrompt DEVE ter conexão DIRETA com a copy e a mensagem do slide. Se o slide fala de "liberdade financeira", a imagem deve transmitir liberdade financeira. Se fala de "tecnologia", mostre tecnologia. NÃO use imagens genéricas de prestadores de obras civis para todos os slides.
- Imagens devem ser cinematográficas e editoriais (não stock photo genérica)
- PÚBLICO-ALVO DQEF: Prestadores de serviço ESTRATÉGICOS e de alta demanda — consultores, designers, copywriters, social media managers, coaches, profissionais de marketing digital, freelancers de tecnologia, fotógrafos, profissionais criativos. NÃO são apenas pedreiros ou eletricistas.
- Conectar visualmente com o TEMA ESPECÍFICO do slide (se fala de crescimento, imagem de crescimento; se fala de dados, imagem conceitual de dados)
- PROIBIDO: imagens genéricas de escritório, modelos posando artificialmente, camisas polo obrigatórias, cenários de obra civil repetitivos
- Estilo visual: editorial magazine, documentary, cinematic color grading
- VARIEDADE: cada slide deve ter uma imagem visualmente DIFERENTE e conectada com SUA copy específica

TEMAS VISUAIS DISPONÍVEIS:
- "editorial-dark": Fundo escuro (#0F0F0F), texto branco, destaques em laranja #E8603C ou amarelo
- "editorial-cream": Fundo creme/bege (#F5F0E8), texto escuro, toques de cor editorial
- "brand-bold": Fundo laranja DQEF #E8603C, texto branco, alto impacto

RETORNE EXATAMENTE ESTE JSON:
{
  "title": "Título do carrossel narrativo",
  "theme": "editorial-dark|editorial-cream|brand-bold",
  "narrative_arc": "Descrição do arco narrativo em 1-2 frases",
  "target_connection": "Como esse conteúdo se conecta com os desejos/interesses do público DQEF",
  "shareability_hook": "Por que as pessoas vão compartilhar isso",
  "caption": "Caption completa com emojis, hashtags e quebras de linha",
  "bestTime": "Melhor horário para postar",
  "slides": [
    {
      "number": 1,
      "type": "hook|context|data|tension|pivot|proof|evidence|insight|cta",
      "layout": "full-image|split|text-heavy|quote|cta",
      "headline": "HEADLINE EM CAIXA ALTA (máx 8 palavras)",
      "bodyText": "Parágrafo explicativo com **destaques em negrito** e dados com (Fonte, Ano). Pode ter múltiplas frases. Null se o slide é só headline.",
      "sourceLabel": "Nome da fonte citada (opcional, ex: Pew Research Center)",
      "imagePrompt": "Prompt detalhado em inglês para geração de imagem editorial/cinematográfica",
      "imageSide": "full|left|right (para layout split)",
      "bgColor": "#hex do fundo quando sem imagem full",
      "textColor": "#hex da cor principal do texto",
      "accentColor": "#hex para destaques e bold"
    }
  ]
}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { topic = '', audience_angle = '', tone = 'editorial', channel = 'Instagram Feed', strategyContext = '', num_slides = 10, researchData = '', researchCitations = [] } = body;

    const [brandContext, userId] = await Promise.all([
      getStrategyContext(req, strategyContext),
      getUserId(req),
    ]);

    // Build research injection block with numbered references
    let researchBlock = '';
    if (researchData) {
      researchBlock = `\n\n=== DADOS VERIFICADOS VIA PESQUISA REAL (Perplexity) ===
REGRA OBRIGATÓRIA DE CITAÇÃO:
- Cada dado abaixo tem um identificador [FACT-N]. 
- Ao usar um dado no slide, MANTENHA O NÚMERO EXATO e a fonte EXATA como fornecidos.
- NÃO altere porcentagens, valores ou atribuições.
- NÃO invente dados adicionais. Se precisar de informação extra, marque como "~estimativa".
- Cite a fonte no formato: "(Nome da Fonte, Ano)" usando EXATAMENTE o nome e ano do FACT correspondente.

${researchData}

FONTES ORIGINAIS: ${(researchCitations as string[]).map((c: string, i: number) => `[${i + 1}] ${c}`).join('\n')}
=== FIM DOS DADOS VERIFICADOS ===`;
    }

    const systemPrompt = `${NARRATIVE_RULES}\n${brandContext}`;

    const userPrompt = topic
      ? `Crie um carrossel narrativo sobre o seguinte tema/tópico:

TEMA: ${topic}
ÂNGULO DE AUDIÊNCIA: ${audience_angle || 'Escolha o mais relevante para o público DQEF'}
TOM: ${tone}
CANAL: ${channel}
NÚMERO DE SLIDES: ${Math.min(Math.max(num_slides, 7), 10)}
${researchBlock}

REGRA OBRIGATÓRIA: ${researchData ? 'Use APENAS os dados da pesquisa acima. Cite as fontes exatamente como fornecidas. NÃO fabrique dados adicionais.' : 'Marque TODOS os dados como "~estimativa" pois não há pesquisa real disponível.'}

O conteúdo deve criar uma narrativa que prenda a atenção do início ao fim. Deve ser altamente compartilhável e conectado com os interesses e desejos do público-alvo da DQEF.

Retorne o JSON completo.`
      : `Modo autônomo: analise a marca DQEF, identifique um tema trending e relevante para o público de prestadores de serviço autônomos, e crie um carrossel narrativo de ${num_slides} slides. Marque TODOS os dados como "~estimativa". Retorne o JSON completo.`;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-router`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SRK}` },
      body: JSON.stringify({
        task_type: "strategy",
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        options: { temperature: 0.9 },
        user_id: userId,
        function_name: "generate-narrative-carousel",
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "AI request failed" }));
      return new Response(JSON.stringify(err), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content ?? '';

    let carousel;
    try {
      carousel = extractJSON(content);
    } catch (e) {
      console.error('JSON parse error:', e, 'Raw:', content.slice(0, 500));
      return new Response(JSON.stringify({ error: 'Erro ao processar resposta da IA. Tente novamente.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ carousel, autonomous: !topic }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
