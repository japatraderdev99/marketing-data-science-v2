# Regras Absolutas de Código

Estas regras não são sugestões. Desviar delas vai criar os mesmos problemas
que existem nos projetos anteriores (arquivos de 4.000 linhas, lentidão, custo alto).

## Tamanho de arquivos

- **Nenhum arquivo pode ultrapassar 400 linhas**
- Se um componente está chegando em 400 linhas, pare imediatamente e divida
- Pages devem ter no máximo 100 linhas — são shells que orquestram features
- Hooks devem ter no máximo 150 linhas
- Edge Functions devem ter no máximo 300 linhas

## Estrutura de componentes

```typescript
// ERRADO: lógica de dados dentro do componente
export function AiCarrosseis() {
  const [data, setData] = useState(null)
  useEffect(() => {
    fetch('/api/carousel').then(...)  // não
  }, [])
  // ... 400 linhas de JSX misturadas com lógica
}

// CORRETO: page é shell, lógica fica em features/
export default function AiCarrosseis() {
  const [mode, setMode] = useState<'direto' | 'narrativa'>('direto')
  return (
    <AppLayout>
      <ModeToggle mode={mode} onModeChange={setMode} />
      {mode === 'direto' ? <DiretoCaousel /> : <NarrativaCarousel />}
    </AppLayout>
  )
}
```

## Estado de servidor

- **Sempre React Query** para dados remotos — nunca `useState` + `useEffect` + `fetch`
- Mutations com `useMutation`, não chamadas diretas
- Cache keys sempre com `[feature, id]` pattern: `['carousel-drafts', workspaceId]`

```typescript
// ERRADO
const [drafts, setDrafts] = useState([])
useEffect(() => {
  supabase.from('creative_drafts').select('*').then(setDrafts)
}, [])

// CORRETO
const { data: drafts } = useQuery({
  queryKey: ['carousel-drafts', workspaceId],
  queryFn: () => fetchCarouselDrafts(workspaceId)
})
```

## Chamadas de IA

- **Nunca** fazer fetch direto para OpenRouter ou Lovable no frontend
- **Sempre** via hook `useAI` centralizado em `src/lib/ai.ts`
- **Nunca** expor API keys no frontend

```typescript
// ERRADO
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  headers: { Authorization: `Bearer ${import.meta.env.VITE_OPENROUTER_KEY}` }
})

// CORRETO
const { call } = useAI()
const result = await call('copy', { context, angle, persona })
```

## Persistência de dados

- **Zero localStorage para dados persistentes** — tudo no Supabase
- localStorage aceitável apenas para preferências de UI (tema, collapse state)
- Drafts, criativos, campanhas, analytics — sempre Supabase

## Tipos TypeScript

- Tipos compartilhados em `src/types/index.ts` — sem duplicação
- Cada feature pode ter seus próprios tipos em `features/[feature]/types.ts`
  mas sem duplicar o que já está em `src/types/index.ts`
- **Sem `any`** — se não sabe o tipo, use `unknown` e faça type guard

## Organização feature-based

```
// ERRADO: type-based
src/
  components/SlideCard.tsx
  components/VariationCard.tsx
  hooks/useCarousel.ts
  hooks/useBatch.ts

// CORRETO: feature-based
src/features/
  carousel/
    components/SlideCard.tsx
    hooks/useCarouselGeneration.ts
  criativo/
    components/VariationCard.tsx
    hooks/useBatchGeneration.ts
```

## Lazy loading

Todas as pages devem usar lazy loading:

```typescript
// src/App.tsx
const AiCarrosseis = lazy(() => import('./pages/AiCarrosseis'))
const Analytics = lazy(() => import('./pages/Analytics'))
```

## Edge Functions

- Cada função tem uma única responsabilidade
- Sempre validar o JWT do usuário antes de processar
- Sempre logar usage em `ai_usage_log` (assíncrono, não bloqueia resposta)
- Sempre ter CORS headers
- Sempre retornar erro em português com mensagem útil

## O que NÃO implementar agora

- VideoIA — deixar placeholder "Em breve"
- Forum
- Google Ads sync (adicionar depois)
- Weekly strategy review automático
- Kanban complexo
- Análise de benchmark
- Monthly report generator

Foco total nas features do `docs/FEATURES.md` marcadas como Phase 1.
