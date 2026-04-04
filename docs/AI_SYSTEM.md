# Sistema de Orquestração de IA

## Task Routing Matrix

Todo request de IA passa pelo `ai-router` edge function que roteia para o modelo
certo baseado no `task_type`.

```
task_type     | modelo primário              | provider      | fallback
--------------|------------------------------|---------------|---------------------------
copy          | claude-sonnet-4              | openrouter    | gemini-2.5-flash (lovable)
strategy      | claude-opus-4                | openrouter    | gemini-2.5-pro (lovable)
classify      | gemini-2.5-flash             | lovable       | sem fallback
suggest       | gemini-2.5-flash             | lovable       | sem fallback
image         | flux-1.1-pro                 | openrouter    | sem fallback
image_hq      | gemini-3-pro-image-preview   | lovable       | sem fallback
analyze       | claude-sonnet-4              | openrouter    | gemini-2.5-flash (lovable)
tag_image     | gemini-2.5-flash (vision)    | lovable       | sem fallback
auto          | openrouter/auto              | openrouter    | gemini-3-flash (lovable)
```

**Regra de escolha de modelo:**
- `copy` — tarefas de criação de texto (carrossel, post, legenda)
- `strategy` — análise estratégica, plano de campanha, diagnóstico
- `classify` — classificação rápida (tipo de conteúdo, angle sugerido)
- `suggest` — sugestão de media, topics, variações
- `image` — geração de imagem (Flux = melhor relação qualidade/custo)
- `image_hq` — imagem de alta qualidade (Gemini 3 = melhor para editorial)
- `analyze` — análise de referência, benchmark, briefing
- `tag_image` — análise de imagem para tagging (vision, barato e rápido)
- `auto` — OpenRouter decide o melhor modelo automaticamente

## Edge Functions (8 funções — Phase 1)

```
supabase/functions/
├── ai-router/                    ← central, todas as chamadas passam aqui
├── generate-carousel-visual/     ← carrossel modo direto
├── generate-narrative-carousel/  ← carrossel modo narrativa
├── generate-creative-batch/      ← variações em lote de criativos estáticos
├── analyze-creative-input/       ← classifica briefing e sugere tipo/angle
├── tag-media/                    ← analisa imagem e gera tags semânticas
├── sync-meta-insights/           ← sincroniza dados do Meta Ads
└── sync-ga4/                     ← sincroniza dados do GA4
```

### ai-router (adaptar do projeto NEW)

Arquivo de referência:
`/Users/gabrielcasarin/Documents/Marketing-data-science-final/marketing-planner-main NEW/supabase/functions/ai-router/index.ts`

Manter:
- Task routing matrix completa
- Sistema de fallback (primary → fallback)
- Cost tracking + logging em ai_usage_log (assíncrono)
- Validação do JWT do usuário
- CORS headers

Adaptar:
- Adicionar task_type `tag_image` (gemini-2.5-flash-vision via lovable)
- Conectar ao novo schema do workspace

### generate-carousel-visual (adaptar do projeto NEW)

Arquivo de referência:
`/Users/gabrielcasarin/Documents/Marketing-data-science-final/marketing-planner-main NEW/supabase/functions/generate-carousel-visual/index.ts`

Manter:
- Sistema de carregamento de playbook da tabela `generative_playbooks`
- Carregamento de estratégia da tabela `strategy_knowledge`
- Regras visuais embutidas (#E8603C, Montserrat 900, 5 slides fixos)
- Output schema completo (slides com type, headline, imagePrompt, bgStyle, layout)
- Modo autônomo (quando context está vazio, IA decide o angle)

Input esperado:
```typescript
{
  workspace_id: string
  context: string
  angle: 'RAIVA' | 'DINHEIRO' | 'ORGULHO' | 'URGENCIA' | 'ALIVIO' | 'AUTO'
  persona: string
  channel: string
  tone: string
  campaign_id?: string  // para injetar context da campanha
}
```

Output esperado:
```typescript
{
  carousel: {
    title: string
    angle: string
    angleEmoji: string
    angleRationale: string
    targetProfile: string
    channel: string
    viralLogic: string
    designNotes: string
    bestTime: string
    caption: string
    slides: Array<{
      number: number
      type: 'hook' | 'setup' | 'data' | 'contrast' | 'validation' | 'cta'
      headline: string          // UPPERCASE
      headlineHighlight: string // palavra para destacar
      subtext?: string
      logic: string             // raciocínio estratégico do slide
      visualDirection: string   // instrução para o designer
      needsMedia: boolean
      mediaType: 'photo' | 'video' | null
      imagePrompt: string       // 80+ palavras em inglês
      bgStyle: 'dark' | 'orange'
      layout: 'text-only' | 'text-photo-split' | 'number-dominant' | 'cta-clean'
    }>
  }
  autonomous: boolean
}
```

### generate-narrative-carousel (adaptar do projeto NEW)

Arquivo de referência:
`/Users/gabrielcasarin/Documents/Marketing-data-science-final/marketing-planner-main NEW/supabase/functions/generate-narrative-carousel/index.ts`

Input esperado:
```typescript
{
  workspace_id: string
  topic: string
  audience_angle: string
  tone: string
  channel: string
  num_slides: number  // 7-10
  research_data?: string
  research_citations?: string[]
}
```

Output: arco narrativo com 7-10 slides, citações, layout editorial.
Modelo: claude-opus-4 via OpenRouter (o mais potente para narrativa).

### generate-creative-batch (NOVO — extrair do Criativo.tsx do NEW)

Esta função não existe nos projetos de referência como edge function.
A lógica está no frontend em `Criativo.tsx` (2.425 linhas).
Extrair essa lógica para o servidor.

Referência de lógica:
`/Users/gabrielcasarin/Documents/Marketing-data-science-final/marketing-planner-main NEW/src/pages/Criativo.tsx`

Input esperado:
```typescript
{
  workspace_id: string
  briefing: string
  angle: string
  channel: string
  objective: string
  nichos: string[]
  variation_count: 2 | 3 | 4 | 6 | 15
  reference_analysis?: string  // se usuário fez upload de imagem referência
  campaign_id?: string
}
```

Output esperado:
```typescript
{
  variations: Array<{
    id: string
    headline: string
    headlineHighlight: string
    subtext: string
    cta: string
    caption: string
    angle: string
    imagePrompt: string       // para geração ou matching na biblioteca
    suggested_tags: string[]  // tags para buscar na media_library
    viralLogic: string
    style: {
      themeId: string
      shape: 'pill' | 'box' | 'diagonal' | 'gradient-bar'
      fontFamily: string
      highlightStyle: 'color' | 'bold' | 'box' | 'none'
      imageOpacity: number
    }
  }>
}
```

Importante: a função retorna `suggested_tags` e `imagePrompt` por variação,
para que o frontend possa primeiro buscar imagens existentes na biblioteca
antes de gerar uma nova via IA.

### tag-media (NOVO)

Analisa uma imagem e retorna tags semânticas, mood, subjects e score de fit por angle.
Usar gemini-2.5-flash com vision (rápido e barato).

Input esperado:
```typescript
{
  workspace_id: string
  media_id: string
  image_url: string
}
```

Output esperado:
```typescript
{
  tags: string[]
  description: string
  mood: string
  subjects: string[]
  colors: string[]
  style: string
  fit_score_map: {
    RAIVA: number    // 0-1
    DINHEIRO: number
    ORGULHO: number
    URGENCIA: number
    ALIVIO: number
  }
}
```

System prompt para tag-media:
```
Você é um especialista em análise visual de conteúdo para marketing de prestadores
de serviços autônomos brasileiros.

Analise a imagem e retorne um JSON com:

- tags: array de 5-15 tags descritivas em português minúsculo
  (ex: ["pessoa", "trabalho externo", "ferramenta manual", "luz natural",
        "close mãos", "estilo documentário", "determinação"])

- description: frase curta descrevendo a imagem para uso em busca
  (ex: "Eletricista em painel elétrico, mãos calejadas, luz natural, close")

- mood: emoção principal da imagem — escolha UM:
  "determinação" | "alívio" | "orgulho" | "urgência" | "raiva" | "foco" |
  "satisfação" | "antes" | "depois" | "neutro"

- subjects: o que aparece na imagem — array de itens:
  ["pessoa", "ferramenta", "ambiente externo", "resultado", "problema", ...]

- colors: cores dominantes em português
  ["laranja", "bege", "marrom", "azul", ...]

- style: estilo visual — escolha UM:
  "documentário" | "editorial" | "publicitário" | "casual" | "corporativo"

- fit_score_map: score de 0 a 1 para cada emotional angle de marketing:
  {
    RAIVA: float,      // serve para conteúdo de indignação/problema
    DINHEIRO: float,   // serve para conteúdo de ganho financeiro
    ORGULHO: float,    // serve para conteúdo de conquista/resultado
    URGENCIA: float,   // serve para conteúdo de prazo/urgência
    ALIVIO: float      // serve para conteúdo de solução/tranquilidade
  }

Retorne APENAS o JSON, sem explicações.
```

Após processar, atualizar a tabela `media_library` com os campos `ai_*`.

### analyze-creative-input (adaptar do projeto NEW)

Arquivo de referência:
`/Users/gabrielcasarin/Documents/Marketing-data-science-final/marketing-planner-main NEW/supabase/functions/analyze-creative-input/index.ts`

Classifica o briefing do usuário e sugere type/angle/persona/tone.
Modelo: gemini-2.5-flash (classify task — rápido e barato).

### sync-meta-insights (adaptar do projeto NEW)

Arquivo de referência:
`/Users/gabrielcasarin/Documents/Marketing-data-science-final/marketing-planner-main NEW/supabase/functions/sync-meta-insights/index.ts`

Puxa dados da Meta Graph API e persiste em `meta_ads_performance`.
Calcular creative_score ao salvar.

### sync-ga4 (adaptar do projeto NEW)

Arquivo de referência:
`/Users/gabrielcasarin/Documents/Marketing-data-science-final/marketing-planner-main NEW/supabase/functions/sync-ga4/index.ts`

Puxa dados do GA4 Data API e persiste em `ga4_metrics`.

## Injeção de Contexto de Marca nos Prompts

Toda edge function de geração deve carregar o contexto da marca antes de chamar a IA:

```typescript
// Padrão a seguir em todas as funções de geração
async function loadBrandContext(workspaceId: string, supabase: SupabaseClient) {
  const [knowledge, playbook] = await Promise.all([
    supabase
      .from('strategy_knowledge')
      .select('extracted_knowledge')
      .eq('workspace_id', workspaceId)
      .eq('status', 'done')
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('generative_playbooks')
      .select('knowledge_json')
      .eq('workspace_id', workspaceId)
      .eq('playbook_type', 'image')
      .single()
  ])

  return {
    strategy: knowledge.data?.extracted_knowledge ?? null,
    playbook: playbook.data?.knowledge_json ?? null
  }
}

// Usar no system prompt:
const brandContext = await loadBrandContext(workspaceId, supabase)
const systemPrompt = `
${BASE_SYSTEM_PROMPT}

${brandContext.strategy ? `
CONTEXTO DA MARCA:
${brandContext.strategy.promptContext}
Tom de voz: ${brandContext.strategy.toneOfVoice}
Público-alvo: ${brandContext.strategy.targetAudience}
Mensagens-chave: ${brandContext.strategy.keyMessages?.join(', ')}
Tópicos proibidos: ${brandContext.strategy.forbiddenTopics?.join(', ')}
` : ''}
`
```

## Logging de Uso de IA (assíncrono)

Toda função que usa IA deve logar o uso. Fazer de forma assíncrona para não
atrasar a resposta:

```typescript
// Não await — fire and forget
supabase.from('ai_usage_log').insert({
  workspace_id: workspaceId,
  user_id: userId,
  function_name: 'generate-carousel-visual',
  task_type: 'copy',
  model_used: modelUsed,
  provider: provider,
  tokens_input: usage?.prompt_tokens,
  tokens_output: usage?.completion_tokens,
  cost_estimate: estimateCost(modelUsed, usage),
  latency_ms: Date.now() - startTime,
  success: true
})
```
