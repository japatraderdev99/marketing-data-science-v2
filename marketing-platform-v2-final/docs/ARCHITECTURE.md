# Arquitetura do Projeto

## Stack Tecnológica

### Frontend
| Tecnologia | Versão | Uso |
|---|---|---|
| React | 18.x | Framework UI |
| Vite | 5.x | Build tool (SWC para transpilação rápida) |
| TypeScript | 5.x | Tipagem |
| Tailwind CSS | 3.x | Estilização |
| shadcn/ui | latest | Componentes UI (Radix UI base) |
| React Router | 6.x | Roteamento com lazy loading |
| TanStack Query | 5.x | Estado de servidor, cache, mutations |
| Recharts | 2.x | Gráficos analytics |
| html-to-image | 1.x | Export PNG de criativos |
| JSZip | 3.x | Export ZIP de lotes |
| Sonner | 1.x | Notificações toast |

### Backend
| Tecnologia | Uso |
|---|---|
| Supabase (PostgreSQL) | Banco de dados principal |
| Supabase Auth | Autenticação |
| Supabase Storage | Armazenamento de imagens |
| Supabase Edge Functions (Deno) | Funções serverless para IA |
| OpenRouter | Orquestração de modelos de IA (primário) |
| Lovable AI Gateway | Modelos Gemini (fallback + imagens) |

## Por que Supabase e não Firebase

Analytics é o core da plataforma. Dados de Meta Ads, GA4 e Google Ads precisam de:
- Agregações SQL (GROUP BY, SUM, AVG, JOINs entre tabelas)
- Time-series queries com filtros de data
- Consultas como "CTR médio por campanha nos últimos 30 dias agrupado por canal"

No Firebase/Firestore, isso requer múltiplas leituras + lógica no cliente.
No PostgreSQL, é uma única query SQL — mais rápido, mais barato, mais correto.

Além disso, o Supabase Edge Functions (Deno) tem cold start ~200ms vs ~800ms do Firebase.

## Estrutura de Pastas

```
marketing-platform-v2/
├── src/
│   ├── features/                    (toda lógica de negócio aqui)
│   │   ├── analytics/
│   │   │   ├── components/
│   │   │   │   ├── MetaAdsTab.tsx
│   │   │   │   ├── GA4Tab.tsx
│   │   │   │   ├── FinancialHealthTab.tsx
│   │   │   │   └── CreativeScoreCard.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useMetaAds.ts
│   │   │   │   └── useGA4.ts
│   │   │   └── types.ts
│   │   ├── carousel/
│   │   │   ├── components/
│   │   │   │   ├── SlideCard.tsx
│   │   │   │   ├── SlidePreview.tsx
│   │   │   │   ├── NarrativeSlideCard.tsx
│   │   │   │   ├── NarrativeSlidePreview.tsx
│   │   │   │   ├── DraftsPanel.tsx
│   │   │   │   ├── AngleSelector.tsx
│   │   │   │   ├── ThemeSelector.tsx
│   │   │   │   └── BatchExportButton.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useCarouselGeneration.ts
│   │   │   │   └── useCarouselDrafts.ts
│   │   │   ├── constants.ts
│   │   │   └── types.ts
│   │   ├── criativo/
│   │   │   ├── components/
│   │   │   │   ├── CreativePreview.tsx
│   │   │   │   ├── VariationCard.tsx
│   │   │   │   ├── BatchControls.tsx
│   │   │   │   ├── StyleSelector.tsx
│   │   │   │   └── ExportPanel.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useBatchGeneration.ts
│   │   │   ├── constants.ts
│   │   │   └── types.ts
│   │   ├── media/                   (biblioteca com tagging IA)
│   │   │   ├── components/
│   │   │   │   ├── MediaGrid.tsx
│   │   │   │   ├── MediaCard.tsx
│   │   │   │   ├── MediaUploader.tsx
│   │   │   │   ├── TagEditor.tsx
│   │   │   │   └── MediaSearchBar.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useMediaLibrary.ts
│   │   │   │   └── useMediaTagging.ts
│   │   │   └── types.ts
│   │   ├── campaigns/
│   │   │   ├── components/
│   │   │   │   ├── CampaignCard.tsx
│   │   │   │   ├── CampaignForm.tsx
│   │   │   │   └── CampaignList.tsx
│   │   │   └── hooks/
│   │   │       └── useCampaigns.ts
│   │   ├── strategy/
│   │   │   ├── components/
│   │   │   │   ├── BrandSetupForm.tsx
│   │   │   │   ├── MetafieldsEditor.tsx
│   │   │   │   └── PlaybookViewer.tsx
│   │   │   └── hooks/
│   │   │       └── useStrategy.ts
│   │   └── auth/
│   │       ├── components/
│   │       │   ├── LoginForm.tsx
│   │       │   └── WorkspaceSetup.tsx
│   │       └── hooks/
│   │           └── useAuth.ts
│   ├── lib/
│   │   ├── supabase.ts              (cliente único do Supabase)
│   │   ├── ai.ts                    (hook useAI centralizado)
│   │   └── utils.ts                 (cn, formatters, helpers)
│   ├── components/
│   │   ├── ui/                      (shadcn components — não editar)
│   │   └── layout/
│   │       ├── Sidebar.tsx
│   │       ├── Header.tsx
│   │       └── AppLayout.tsx
│   ├── pages/                       (shells finos — max 100 linhas cada)
│   │   ├── Analytics.tsx
│   │   ├── AiCarrosseis.tsx
│   │   ├── Criativo.tsx
│   │   ├── Campanhas.tsx
│   │   ├── Estrategia.tsx
│   │   ├── Biblioteca.tsx
│   │   ├── CriativosAtivos.tsx
│   │   └── Index.tsx
│   ├── types/
│   │   └── index.ts                 (todos os tipos compartilhados)
│   ├── hooks/
│   │   └── useWorkspace.ts
│   └── App.tsx                      (router com lazy loading)
├── supabase/
│   ├── functions/                   (8 edge functions — ver AI_SYSTEM.md)
│   └── migrations/                  (SQL schema — ver DATABASE.md)
├── docs/                            (este diretório)
├── CLAUDE.md
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

## Padrão de hook centralizado de IA

```typescript
// src/lib/ai.ts
import { supabase } from './supabase'
import { useSession } from '../features/auth/hooks/useAuth'

export type AITaskType =
  | 'copy'
  | 'strategy'
  | 'classify'
  | 'suggest'
  | 'image'
  | 'image_hq'
  | 'analyze'
  | 'tag_image'   // para tagging da biblioteca de mídia
  | 'auto'

export function useAI() {
  const session = useSession()

  async function call(taskType: AITaskType, payload: Record<string, unknown>) {
    const { data, error } = await supabase.functions.invoke('ai-router', {
      body: { task_type: taskType, ...payload },
      headers: { Authorization: `Bearer ${session?.access_token}` }
    })
    if (error) throw new Error(error.message)
    return data
  }

  return { call }
}
```

## Padrão de query com React Query

```typescript
// features/carousel/hooks/useCarouselDrafts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'

export function useCarouselDrafts(workspaceId: string) {
  const qc = useQueryClient()

  const drafts = useQuery({
    queryKey: ['carousel-drafts', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creative_drafts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .in('type', ['carousel_direct', 'carousel_narrative'])
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!workspaceId
  })

  const saveDraft = useMutation({
    mutationFn: async (draft: NewCarouselDraft) => {
      const { data, error } = await supabase
        .from('creative_drafts')
        .insert(draft)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['carousel-drafts', workspaceId] })
  })

  return { drafts, saveDraft }
}
```

## Variáveis de Ambiente

```env
# .env.local (frontend)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# supabase/functions/.env (edge functions)
SUPABASE_SERVICE_ROLE_KEY=
OPENROUTER_API_KEY=
LOVABLE_API_KEY=
```
