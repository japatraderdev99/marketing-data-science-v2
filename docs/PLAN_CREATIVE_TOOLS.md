# Plano: Finalizar Ferramentas Criativas

## Contexto

O PR `claude/loving-feynman` já entregou:
- `useImageGeneration` hook (single, batch, library search, save)
- `suggest-media` edge function
- `CriativoBatch` reescrito com `generateCreativeBatch`
- `VariationCard` com image gen/prompt/library
- `MassControls` com batch ops + format selector
- `SlideCard` com per-slide image gen
- `DirectCarousel` wired com image gen

## O que falta (em ordem de prioridade)

---

### TASK 1: ArteUnica — Adicionar image gen + format + export PNG funcional
**Arquivo:** `app/src/features/criativo/ArteUnica.tsx` (245 linhas)

O que fazer:
1. Importar `useImageGeneration` de `@/hooks/useImageGeneration`
2. Importar `CREATIVE_FORMATS` de `@/features/carousel/constants`
3. Adicionar state: `imageUrl`, `format` (default `CREATIVE_FORMATS[0]`)
4. Usar `generateForVariation` do hook para o botão "Gerar Imagem"
5. Adicionar painel de prompt (igual ao do `VariationCard`) com:
   - textarea para editar `imagePrompt` (vem do `slide.imagePrompt`)
   - botão "Gerar com IA"
   - botão "Buscar Biblioteca" → `searchLibraryForOne`
   - thumbnails de sugestões com score
6. Adicionar seletor de formato (dropdown com `CREATIVE_FORMATS`)
7. Fazer o `SlidePreview` usar `width/height` do format selecionado (escalar proporcionalmente para preview de ~400px)
8. Implementar `handleExportPng` real com `toPng` (igual ao `VariationCard.handleExportPng`)
   - Render off-screen com `createRoot` + `flushSync` no tamanho real do format
   - Incluir `imageUrl` no render
9. Passar `imageUrl` para `<SlidePreview imageUrl={imageUrl} />`

**Referência:** `VariationCard.tsx` linhas 38-48 (export) e linhas 130-175 (image panel)

---

### TASK 2: Google Fonts injection
**Arquivo:** `app/src/App.tsx` ou `app/src/main.tsx`

Adicionar no top-level (useEffect ou inline script):
```tsx
const FONT_FAMILIES = ['Montserrat', 'Oswald', 'Bebas Neue', 'Anton', 'Teko', 'Inter'];
const families = FONT_FAMILIES.map(f => `family=${f.replace(/ /g, '+')}:wght@400;700;900`).join('&');
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
document.head.appendChild(link);
```

Isso garante que os fonts carregam antes do export PNG. Pode ser feito em `main.tsx` antes do `createRoot`.

---

### TASK 3: Draft persistence (salvar/carregar rascunhos)
**Tabela:** `creative_drafts` (já existe no schema)
**Arquivos novos:** `app/src/hooks/useDrafts.ts`
**Arquivos a editar:** `ArteUnica.tsx`, `CriativoBatch.tsx`

Hook `useDrafts`:
```ts
interface UseDraftsReturn {
  drafts: CreativeDraft[];
  isLoading: boolean;
  saveDraft: (type: DraftType, title: string, content: Record<string, unknown>) => Promise<void>;
  loadDraft: (id: string) => Promise<CreativeDraft>;
  deleteDraft: (id: string) => Promise<void>;
}
```

Usar React Query:
- `useQuery(['drafts', draftType])` para listar
- `useMutation` para save/delete
- Query key: `['drafts']`

Integração nos componentes:
- Botão "Salvar Rascunho" ao lado de "Limpar tudo"
- Lista de rascunhos em um dropdown/panel colapsável no sidebar
- Ao carregar: restaurar `variations`, `settingsMap`, `themeId`, `format`
- `content_json` deve conter: `{ variations, settingsMap, themeId, format, briefing, angle, channel }`

**Tipo:** `draft_type = 'static_post'` para ArteUnica, `'batch'` para CriativoBatch

---

### TASK 4: Carousel image gen batch — "Gerar Todas Imagens" no DirectCarousel
**Arquivo:** `app/src/features/carousel/DirectCarousel.tsx`

Adicionar um botão global "Gerar Imagens para Todos os Slides" que:
1. Filtra slides que ainda não têm imagem em `slideImages`
2. Usa `generateAllImages` do `useImageGeneration` hook
3. Mapeia `carousel.slides` para `BatchVariation[]` temporário (id=`slide-N`, headline, imagePrompt)
4. Mostra progress

Adicionar ao lado do `BatchExportButton`:
```tsx
<button onClick={handleGenerateAllSlideImages} disabled={generatingAll}>
  {generatingAll ? `Gerando ${imageGenProgress?.current}/${imageGenProgress?.total}...` : 'Gerar Todas Imagens'}
</button>
```

---

### TASK 5: NarrativeCarousel — image gen (mesma abordagem)
**Arquivo:** `app/src/features/carousel/NarrativeCarousel.tsx` (205 linhas)

Mesmo padrão do DirectCarousel:
1. Importar `useImageGeneration`
2. State `slideImages: Record<number, string>`
3. Per-slide image gen (botão no hover)
4. Batch "Gerar Todas"
5. Passar `imageUrl` para `NarrativeSlidePreview`

**Nota:** `NarrativeSlidePreview` precisa aceitar prop `imageUrl` — verificar se já aceita. Se não, adicionar (mesmo padrão do `SlidePreview`).

---

## Regras para seguir

1. **Nenhum arquivo > 400 linhas** — se chegar perto, extrair em componente
2. **Sem `any`** — types em `src/types/index.ts`
3. **Sem API calls no frontend** — tudo via `src/lib/ai.ts` → edge functions
4. **React Query** para persistência (drafts)
5. **Testar build** com `npx vite build` após cada task
6. **PATH necessário:** `export PATH="/usr/local/bin:$PATH"` antes de rodar comandos node

## Ordem de execução

```
TASK 1 (ArteUnica image gen) → TASK 2 (fonts) → TASK 4 (carousel batch) → TASK 3 (drafts) → TASK 5 (narrative)
```

Tasks 1 e 2 são as mais críticas. Task 3 é a mais complexa. Tasks 4 e 5 são incrementais.
