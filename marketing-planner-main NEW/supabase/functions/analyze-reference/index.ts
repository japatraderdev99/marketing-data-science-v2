import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AnalyzeRequest {
  referenceText: string;
  referenceImageUrl?: string;
  count: number;
  angles: string[];
  channel: string;
  objective: string;
  persona: string;
  styles: { label: string; racional: string }[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: AnalyzeRequest = await req.json();
    const {
      referenceText,
      referenceImageUrl,
      count,
      angles,
      channel,
      objective,
      persona,
      styles,
    } = body;

    if (!referenceText && !referenceImageUrl) {
      return new Response(
        JSON.stringify({ error: "Nenhuma referência fornecida." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const systemPrompt = `Você é um copywriter sênior especializado em performance para Meta Ads e Instagram.
Sua marca é a DQEF (Deixa Que Eu Faço) — um marketplace de serviços locais que cobra 10-15% de comissão vs 27% da GetNinjas, com pagamento via PIX na hora.

REGRAS ABSOLUTAS:
1. Você receberá uma REFERÊNCIA DE COPY. Analise-a profundamente: identifique o TEMA CENTRAL, a PROMESSA, o PÚBLICO e o TOM.
2. Todas as ${count} variações DEVEM manter o mesmo TEMA e PROMESSA da referência. NÃO invente novos assuntos.
3. Varie APENAS: ângulo emocional, estrutura da frase, palavras-chave, intensidade e CTA.
4. Headlines devem ter no MÁXIMO 8 palavras, impactantes, em linguagem de prestador.
5. Body text deve ter no MÁXIMO 20 palavras, complementar à headline.
6. CTA deve ser uma ação clara e curta (máx 6 palavras).
7. Cada variação deve ter um imagePrompt descrevendo uma foto documental brasileira real (sem texto na imagem), CONECTADA DIRETAMENTE ao tema e à emoção da headline específica dessa variação.
8. Se o ângulo indicado for "IA escolhe", você DEVE analisar a referência e decidir o melhor ângulo emocional para CADA variação (Raiva, Dinheiro, Orgulho, Urgência ou Alívio). Distribua entre os ângulos que mais fazem sentido para o tema.
9. Para "highlightWords": escolha as 1-3 palavras MAIS IMPACTANTES da headline — as que causam mais emoção ou urgência. Formato: pipe-separated (ex: "TAXA|ABUSIVA").
10. Para "suggestedOpacity": sugira a opacidade ideal da imagem de fundo (0 a 1) baseada no estilo da variação:
    - Estilos com texto dominante (Impacto, Provocação): 0.55-0.65
    - Estilos documentais (foto forte): 0.85-0.95
    - Estilos com fundo claro (Social Proof): 0.25-0.35
    - Estilos minimalistas: 0.75-0.85
11. Para "suggestedShape": sugira entre "none", "pill", "box", "diagonal", "gradient-bar", "circle-accent" baseado no ângulo emocional:
    - Raiva/Provocação → "diagonal" ou "box"
    - Dinheiro/Social Proof → "pill" ou "gradient-bar"
    - Orgulho → "circle-accent" ou "none"
    - Urgência → "gradient-bar" ou "diagonal"
    - Alívio → "none" ou "pill"

TOM: direto, sem rodeios, prestador falando com prestador. Dados concretos (R$, %, dias).
PÚBLICO: ${persona}
CANAL: ${channel}
OBJETIVO: ${objective}

REGRAS DE IMAGEM (imagePrompt) — DIRETRIZES RÍGIDAS:
- A cena descrita DEVE estar conectada DIRETAMENTE ao tema da headline. Exemplos:
  * Se headline fala de "TAXA ABUSIVA" → prestador olhando extrato/fatura com expressão de frustração
  * Se headline fala de "PIX NA HORA" → prestador conferindo celular com sorriso, recebendo pagamento
  * Se headline fala de "LIBERDADE" → prestador em ambiente aberto, confiante, com ferramentas
  * Se headline fala de "AGENDA VAZIA" → prestador em oficina organizada esperando, olhando o celular
- Mostre trabalhadores brasileiros diversos em ambientes PROFISSIONAIS e NEUTROS (oficinas limpas, residências em reforma, áreas externas organizadas).
- VARIEDADE DE ROUPA OBRIGATÓRIA: variar entre camisetas lisas (branca, cinza, preta, verde, vermelha, amarela), regatas, camisas de trabalho abertas, macacões, coletes refletivos, camisas de manga curta — PROIBIDO usar polo azul como padrão em todas as variações. Cada variação DEVE ter roupa DIFERENTE.
- CENÁRIOS PROIBIDOS: favelas, ruas degradadas, ambientes precários, pobreza, situações de marginalização.
- NÃO reforce estereótipos raciais ou socioeconômicos.
- Represente diversidade real: diferentes etnias (brancos, pardos, negros, asiáticos), idades e gêneros em contextos DIGNOS e PROFISSIONAIS.
- Foque em COMPETÊNCIA TÉCNICA, ORGULHO PROFISSIONAL e AUTONOMIA.
- Ambientes: oficinas organizadas, residências modernas em reforma, áreas externas limpas, apartamentos, casas de classe média.
- Estilo: fotografia documental brasileira, câmera Canon R5, 35mm f/2.8, luz natural warm.`;

    const variationSpecs = Array.from({ length: count }, (_, i) => {
      const angle = angles[i % angles.length];
      const style = styles[i % styles.length];
      return `Variação ${i + 1}: Ângulo "${angle}", Estilo "${style.label}" (${style.racional})`;
    }).join("\n");

    const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

    userContent.push({
      type: "text",
      text: `REFERÊNCIA DE COPY PARA ANÁLISE:
---
${referenceText || "(ver imagem anexa)"}
---

Crie exatamente ${count} variações de criativo estático baseadas EXCLUSIVAMENTE nessa referência.

ESPECIFICAÇÕES POR VARIAÇÃO:
${variationSpecs}

Retorne um JSON com esta estrutura exata (sem markdown, sem texto extra):
{
  "analysis": {
    "theme": "tema central identificado na referência",
    "promise": "promessa principal",
    "audience": "público-alvo identificado",
    "tone": "tom identificado"
  },
  "variations": [
    {
      "index": 1,
      "angle": "nome do ângulo",
      "style": "nome do estilo",
      "headline": "HEADLINE EM CAIXA ALTA (máx 8 palavras)",
      "body": "Texto complementar curto (máx 20 palavras)",
      "cta": "Texto do botão CTA claro e curto (máx 6 palavras, ex: CADASTRE-SE GRÁTIS)",
      "caption": "Legenda completa para o post com hashtags",
      "imagePrompt": "Descrição CONTEXTUAL de foto documental brasileira real conectada ao tema da headline — SEM TEXTO na imagem, SEM favelas, ambientes profissionais dignos",
      "highlightWords": "PALAVRA1|PALAVRA2 (1-3 palavras mais impactantes da headline, pipe-separated)",
      "suggestedOpacity": 0.65,
      "suggestedShape": "gradient-bar",
      "viralLogic": "Por que essa variação vai converter (1 frase)"
    }
  ]
}`,
    });

    if (referenceImageUrl) {
      userContent.push({
        type: "image_url",
        image_url: { url: referenceImageUrl },
      });
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-router`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SRK}`,
      },
      body: JSON.stringify({
        task_type: "copy",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent.length === 1 ? userContent[0].text : userContent },
        ],
        options: { temperature: 0.85 },
        function_name: "analyze-reference",
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const errText = await response.text();
      console.error("AI error:", status, errText);

      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit. Tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: `AI error: ${status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content ?? "";

    let parsed;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return new Response(
        JSON.stringify({ error: "Falha ao interpretar resposta da IA", raw: content }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ success: true, result: parsed, _meta: aiData._meta }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("analyze-reference error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
