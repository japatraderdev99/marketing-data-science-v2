# Biblioteca de Mídia com Tagging Inteligente

## Problema que resolve

Nos projetos anteriores, para cada slide ou criativo gerado, uma nova imagem era
solicitada via IA (Flux ou Gemini). Isso é:
- Caro (cada imagem gerada tem custo de token/API)
- Lento (geração de imagem demora 5-15 segundos)
- Inconsistente (o mesmo contexto pode gerar imagens completamente diferentes)

A solução é uma biblioteca de mídia onde cada imagem (gerada por IA ou enviada
pelo usuário) recebe tags semânticas automáticas, permitindo reaproveitar imagens
existentes por matching com o contexto do criativo.

## Como funciona

### 1. Upload ou Geração de Imagem

Toda imagem que entra no sistema passa pelo mesmo pipeline:

```
imagem →  upload para Supabase Storage
       →  registro em media_library (tagging_status: 'pending')
       →  trigger assíncrono para tag-media edge function
       →  campos ai_* preenchidos (tagging_status: 'done')
```

Se a imagem foi gerada por IA (ex: no carrossel), também passa por esse pipeline
ao ser salva na biblioteca.

### 2. Tagging Automático via IA

O `tag-media` edge function usa `gemini-2.5-flash` com visão para analisar cada
imagem e gerar:

| Campo | Tipo | Exemplo |
|---|---|---|
| `ai_tags` | string[] | `["pessoa", "trabalho externo", "mãos", "ferramenta", "luz natural"]` |
| `ai_description` | string | `"Eletricista 40 anos em painel elétrico, mãos calejadas, close, documentário"` |
| `ai_mood` | string | `"determinação"` |
| `ai_subjects` | string[] | `["pessoa", "ferramenta", "ambiente externo"]` |
| `ai_colors` | string[] | `["laranja", "bege", "marrom escuro"]` |
| `ai_style` | string | `"documentário"` |
| `ai_fit_score_map` | jsonb | `{ ORGULHO: 0.9, ALIVIO: 0.7, RAIVA: 0.2, DINHEIRO: 0.5, URGENCIA: 0.3 }` |

O `fit_score_map` é a chave do matching: cada imagem sabe o quão bem ela "encaixa"
em cada emotional angle de marketing.

### 3. Matching no momento de criação de criativos

Quando o usuário gera um carrossel ou lote de criativos:

**a)** A edge function retorna, além do copy, um `imagePrompt` e `suggested_tags`
por slide/variação.

**b)** O frontend primeiro busca na `media_library` por imagens que fazem matching:

```typescript
// hooks/useMediaMatching.ts
async function findMatchingMedia(
  workspaceId: string,
  angle: string,
  suggestedTags: string[],
  minScore = 0.5
) {
  const { data } = await supabase
    .from('media_library')
    .select('id, file_url, thumbnail_url, ai_description, ai_fit_score_map')
    .eq('workspace_id', workspaceId)
    .eq('tagging_status', 'done')
    .contains('ai_tags', suggestedTags.slice(0, 3))  // match parcial de tags
    .order(`ai_fit_score_map->>${angle}`, { ascending: false })
    .limit(5)

  // Filtrar por score mínimo
  return data?.filter(m => (m.ai_fit_score_map?.[angle] ?? 0) >= minScore) ?? []
}
```

**c)** Se encontrou imagens com score adequado → usa a existente
**d)** Se não encontrou → oferece ao usuário a opção de gerar via IA

### 4. Fluxo na UI do Carrossel

```
Para cada slide:
  [Buscar na biblioteca]  →  se encontrou: mostra opções rankeadas por score
                          →  se não encontrou: botão "Gerar com IA"

O usuário pode:
  - Aceitar sugestão da biblioteca (score alto = boa correspondência)
  - Trocar por outra imagem da biblioteca
  - Gerar nova imagem via IA (que automaticamente vai para a biblioteca com tags)
```

### 5. Fluxo na UI de Criativo Batch

```
Ao gerar N variações:
  → Para cada variação, buscar imagem com melhor fit_score para o angle
  → Mostrar thumbnail da imagem sugerida em cada VariationCard
  → Usuário pode trocar individual ou gerar nova
  → "Aplicar melhores imagens" aplica automaticamente para todas as variações
```

## Componentes da Feature

### MediaGrid.tsx
```typescript
// Lista todas as imagens do workspace com filtros
// Props: workspaceId, filterByMood?, filterByTags?, filterByStyle?
// Mostra: thumbnail, mood badge, top 3 tags, score para angle atual
```

### MediaCard.tsx
```typescript
// Card individual de uma imagem
// Mostra: thumbnail, ai_description, mood chip, tags, fit_score bar
// Ações: selecionar, editar tags manuais, favoritar, deletar
```

### MediaUploader.tsx
```typescript
// Upload de imagem com drag and drop
// Ao fazer upload: registra no Supabase Storage + dispara tagging
// Mostra status: "Analisando imagem..." enquanto tagging_status = 'processing'
```

### TagEditor.tsx
```typescript
// Editar tags manuais de uma imagem
// Mostra ai_tags como read-only (geradas pela IA)
// Permite adicionar/remover manual_tags
// Permite alterar category: "before" | "after" | "process" | "person" | "tool" | "environment"
```

### MediaSearchBar.tsx
```typescript
// Busca por texto livre na ai_description
// Filtros: mood, style, category, angle (ordena por fit_score)
// Resultado em tempo real com debounce 300ms
```

## Hook: useMediaLibrary

```typescript
// features/media/hooks/useMediaLibrary.ts
export function useMediaLibrary(workspaceId: string) {
  const [filters, setFilters] = useState<MediaFilters>({})

  const media = useQuery({
    queryKey: ['media-library', workspaceId, filters],
    queryFn: () => fetchMedia(workspaceId, filters)
  })

  const uploadMedia = useMutation({
    mutationFn: async (file: File) => {
      // 1. Upload para Supabase Storage
      const path = `${workspaceId}/${Date.now()}-${file.name}`
      const { data: upload } = await supabase.storage
        .from('media')
        .upload(path, file)

      // 2. Registrar na tabela com tagging_status: 'pending'
      const { data: record } = await supabase
        .from('media_library')
        .insert({
          workspace_id: workspaceId,
          user_id: userId,
          file_url: getPublicUrl(path),
          file_name: file.name,
          tagging_status: 'pending'
        })
        .select()
        .single()

      // 3. Disparar tagging assíncrono (não await)
      supabase.functions.invoke('tag-media', {
        body: { workspace_id: workspaceId, media_id: record.id, image_url: record.file_url }
      })

      return record
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['media-library', workspaceId] })
  })

  return { media, uploadMedia, setFilters }
}
```

## Hook: useMediaTagging

```typescript
// features/media/hooks/useMediaTagging.ts
// Poll para atualizar status de tagging em tempo real
export function useMediaTagging(mediaId: string) {
  return useQuery({
    queryKey: ['media-tagging', mediaId],
    queryFn: () => supabase
      .from('media_library')
      .select('tagging_status, ai_tags, ai_description, ai_mood')
      .eq('id', mediaId)
      .single(),
    refetchInterval: (data) =>
      data?.tagging_status === 'pending' || data?.tagging_status === 'processing'
        ? 2000   // poll a cada 2s enquanto processando
        : false  // para o poll quando done
  })
}
```

## Integração com Geração de Criativos

### No useCarouselGeneration.ts

```typescript
// Após gerar o carousel, para cada slide com needsMedia: true
async function suggestOrGenerateImages(slides: SlideOutput[], angle: string) {
  return Promise.all(
    slides
      .filter(s => s.needsMedia)
      .map(async (slide) => {
        // Extrai tags sugeridas do imagePrompt
        const suggested = extractTagsFromPrompt(slide.imagePrompt)

        // Busca na biblioteca primeiro
        const matches = await findMatchingMedia(workspaceId, angle, suggested)

        return {
          slideNumber: slide.number,
          libraryMatches: matches,  // pode ser vazio
          hasMatch: matches.length > 0,
          imagePrompt: slide.imagePrompt  // usado se não encontrar
        }
      })
  )
}
```

### No useBatchGeneration.ts

```typescript
// Após gerar as variações, buscar imagens para cada uma
async function assignImages(variations: CreativeVariation[]) {
  return Promise.all(
    variations.map(async (v) => {
      const matches = await findMatchingMedia(
        workspaceId,
        v.angle,
        v.suggested_tags,
        0.6  // score mínimo de 60%
      )

      return {
        ...v,
        imageUrl: matches[0]?.file_url ?? null,  // melhor match ou null
        imageSource: matches[0] ? 'library' : 'generate'
      }
    })
  )
}
```

## Referência nos Projetos Existentes

O projeto `marketing-planner-main NEW` tem as seguintes funções relacionadas,
mas sem a lógica de fit_score e angle matching:

- `/supabase/functions/suggest-media/` — sugere imagens por relevância básica
- `/supabase/functions/categorize-media/` — categoriza imagens por tipo
- Tabela `media_library` existe com tags mas sem `fit_score_map`

Ao implementar, aproveitar a lógica de upload e categorização, e adicionar:
1. Campo `ai_fit_score_map` na tabela
2. `tag-media` function com o system prompt de análise por angle
3. Lógica de matching por score nos hooks de geração

## Estimativa de Custo

| Operação | Modelo | Custo estimado |
|---|---|---|
| Tag de imagem | gemini-2.5-flash (vision) | ~$0.001 por imagem |
| Busca por matching | SQL query | $0 |
| Geração de imagem (se necessário) | flux-1.1-pro | ~$0.04 por imagem |

Reutilizando imagens da biblioteca: economia de 97.5% por imagem.
Com 100 criativos por mês (cada um com 1 imagem): de ~$4 para ~$0.10.
