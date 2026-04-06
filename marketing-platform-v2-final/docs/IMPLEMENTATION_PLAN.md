# Plano de Implementação — Passo a Passo

Execute nesta ordem exata. Confirme cada passo antes de avançar.
Sempre que for implementar uma feature, leia o arquivo de referência indicado
em `docs/REFERENCES.md` antes de escrever qualquer código.

---

## Passo 1 — Setup do Projeto

```bash
npm create vite@latest . -- --template react-ts
npm install
```

Instalar dependências:
```bash
npm install @supabase/supabase-js @tanstack/react-query react-router-dom
npm install tailwindcss postcss autoprefixer
npm install recharts html-to-image jszip sonner
npm install @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-tabs
npm install react-hook-form zod @hookform/resolvers
npm install clsx tailwind-merge lucide-react
npm install -D @types/node
```

Configurar shadcn/ui:
```bash
npx shadcn@latest init
```

Configurar componentes essenciais do shadcn:
```bash
npx shadcn@latest add button input label select textarea card badge
npx shadcn@latest add dialog sheet tabs progress toast
npx shadcn@latest add dropdown-menu separator skeleton avatar
```

Configurar Vite para alias:
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  }
})
```

Verificar: `npm run dev` deve subir sem erros.

---

## Passo 2 — Supabase Setup

1. Criar projeto no Supabase (supabase.com)
2. Copiar URL e anon key para `.env.local`:
   ```
   VITE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

3. Criar arquivo do cliente:
   ```typescript
   // src/lib/supabase.ts
   import { createClient } from '@supabase/supabase-js'

   export const supabase = createClient(
     import.meta.env.VITE_SUPABASE_URL,
     import.meta.env.VITE_SUPABASE_ANON_KEY
   )
   ```

4. Executar migrations do `docs/DATABASE.md` no SQL Editor do Supabase
   (na ordem: 001 → 002 → 003 → 004 → 005 → 006 → 007 → 008)

5. Criar bucket no Supabase Storage: `media` (público)

Verificar: console do Supabase deve mostrar todas as tabelas criadas.

---

## Passo 3 — Configuração Base do App

Criar:
- `src/lib/utils.ts` — função `cn()` do shadcn
- `src/types/index.ts` — tipos compartilhados (Workspace, Campaign, CarouselDraft, etc.)
- `src/lib/ai.ts` — hook `useAI` (ver `docs/ARCHITECTURE.md`)
- `src/hooks/useWorkspace.ts` — contexto do workspace ativo
- `src/App.tsx` — router com lazy loading para todas as pages
- `src/components/layout/Sidebar.tsx` — navegação lateral
- `src/components/layout/AppLayout.tsx` — wrapper com sidebar

Estrutura da sidebar (itens de menu):
```
Dashboard (/)
Campanhas (/campanhas)
AI Carrossel (/carrossel)
Criativo Batch (/criativo)
Biblioteca (/biblioteca)
Analytics (/analytics)
Criativos Ativos (/criativos-ativos)
Estratégia (/estrategia)
---
VideoIA (/video) → badge "Em breve"
```

---

## Passo 4 — Auth & Workspace

Implementar:
1. `features/auth/hooks/useAuth.ts` — sessão, login, logout
2. `features/auth/components/LoginForm.tsx` — email/senha
3. `features/auth/components/WorkspaceSetup.tsx` — onboarding
4. `pages/Auth.tsx` — shell da página de auth
5. Proteção de rotas no `App.tsx`

Fluxo:
- Usuário não autenticado → `/auth`
- Usuário autenticado sem workspace → `/onboarding`
- Usuário autenticado com workspace → `/`

---

## Passo 5 — Edge Functions (ai-router primeiro)

Inicializar Supabase CLI localmente:
```bash
npx supabase init
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
```

Implementar na ordem:

**5a. ai-router**
- Ler referência: `NEW/supabase/functions/ai-router/index.ts`
- Adaptar para novo schema
- Adicionar task_type `tag_image` na task matrix
- Deploy: `npx supabase functions deploy ai-router`

**5b. generate-carousel-visual**
- Ler referência: `NEW/supabase/functions/generate-carousel-visual/index.ts`
- Adaptar queries para novo schema
- Deploy

**5c. generate-narrative-carousel**
- Ler referência: `NEW/supabase/functions/generate-narrative-carousel/index.ts`
- Deploy

**5d. generate-creative-batch (NOVO)**
- Extrair lógica de batch de: `NEW/src/pages/Criativo.tsx`
- Ver spec em `docs/AI_SYSTEM.md`
- Deploy

**5e. analyze-creative-input**
- Ler referência: `NEW/supabase/functions/analyze-creative-input/index.ts`
- Deploy

**5f. tag-media (NOVO)**
- Spec completa em `docs/MEDIA_LIBRARY.md` e `docs/AI_SYSTEM.md`
- Usar gemini-2.5-flash com vision via lovable gateway
- Após processar: UPDATE media_library SET ai_tags, ai_description, ai_mood, ... WHERE id = media_id
- Deploy

**5g. sync-meta-insights**
- Ler referência: `NEW/supabase/functions/sync-meta-insights/index.ts`
- Adaptar para novo schema (calcular creative_score ao salvar)
- Deploy

**5h. sync-ga4**
- Ler referência: `NEW/supabase/functions/sync-ga4/index.ts`
- Adaptar para novo schema
- Deploy

Configurar secrets das edge functions:
```bash
npx supabase secrets set OPENROUTER_API_KEY=sk-or-...
npx supabase secrets set LOVABLE_API_KEY=...
```

---

## Passo 6 — Feature: Biblioteca de Mídia

Implementar antes do carrossel (pois o carrossel depende da biblioteca para matching).

1. `features/media/types.ts`
2. `features/media/hooks/useMediaLibrary.ts` — upload, lista, filtros
3. `features/media/hooks/useMediaTagging.ts` — poll do status de tagging
4. `features/media/components/MediaUploader.tsx` — drag & drop
5. `features/media/components/MediaCard.tsx` — card com tags e mood
6. `features/media/components/MediaGrid.tsx` — grid com filtros
7. `features/media/components/TagEditor.tsx` — edição de tags manuais
8. `features/media/components/MediaSearchBar.tsx`
9. `pages/Biblioteca.tsx` — shell

Verificar: upload funciona, tagging dispara, tags aparecem após ~5s.

---

## Passo 7 — Feature: AI Carrossel

1. `features/carousel/types.ts` — ler `MAIN/src/components/carousel/types.ts`
2. `features/carousel/constants.ts` — ler `MAIN/src/components/carousel/constants.ts`
3. `features/carousel/components/SlidePreview.tsx` — ler `MAIN/src/components/carousel/SlidePreview.tsx`
4. `features/carousel/components/SlideCard.tsx` — ler `MAIN/src/components/carousel/SlideCard.tsx`
5. `features/carousel/components/NarrativeSlidePreview.tsx`
6. `features/carousel/components/NarrativeSlideCard.tsx`
7. `features/carousel/components/AngleSelector.tsx`
8. `features/carousel/components/ThemeSelector.tsx`
9. `features/carousel/components/BatchExportButton.tsx` — ler `MAIN/src/components/carousel/BatchExport.tsx`
10. `features/carousel/components/DraftsPanel.tsx` — ler `MAIN/src/components/carousel/DraftsPanel.tsx`
11. `features/carousel/hooks/useCarouselGeneration.ts` — inclui matching com biblioteca
12. `features/carousel/hooks/useCarouselDrafts.ts`
13. Subfeature DiretoCaousel (compõe componentes 3-10)
14. Subfeature NarrativaCarousel (compõe componentes 5-10)
15. `pages/AiCarrosseis.tsx` — shell com toggle de modo

Verificar:
- Modo direto gera 5 slides
- Busca imagem na biblioteca antes de gerar
- Preview renderiza com temas
- Export ZIP funciona
- Draft salva e carrega

---

## Passo 8 — Feature: Criativo Batch

1. `features/criativo/types.ts`
2. `features/criativo/constants.ts` — visual styles, angles, nichos
3. `features/criativo/components/CreativePreview.tsx`
4. `features/criativo/components/VariationCard.tsx` — com imagem da biblioteca
5. `features/criativo/components/BatchControls.tsx` — inputs + progresso
6. `features/criativo/components/StyleSelector.tsx` — 6 estilos visuais
7. `features/criativo/components/ExportPanel.tsx`
8. `features/criativo/hooks/useBatchGeneration.ts` — lógica de batch + matching
9. `pages/Criativo.tsx` — shell

Verificar:
- Gera N variações com progresso em tempo real
- Cada variação tem imagem da biblioteca (quando disponível)
- Export ZIP com todas as variações
- Draft salva o lote completo

---

## Passo 9 — Feature: Analytics

1. `features/analytics/types.ts`
2. `features/analytics/hooks/useMetaAds.ts` — fetch + score calculation
3. `features/analytics/hooks/useGA4.ts`
4. `features/analytics/components/CreativeScoreCard.tsx` — badge colorido por score
5. `features/analytics/components/MetaAdsTab.tsx`
6. `features/analytics/components/GA4Tab.tsx`
7. `features/analytics/components/FinancialHealthTab.tsx`
8. `pages/Analytics.tsx` — shell com tabs + botão sync

Lógica de score (extrair de `NEW/src/pages/Analytics.tsx` linhas 1-100):
```
score = normalize(ctr, 0, maxCtr) * 0.30
      + (1 - normalize(cpc, minCpc, maxCpc)) * 0.20
      + normalize(conversions, 0, maxConv) * 0.30
      + normalize(impressions/spend, 0, maxEff) * 0.20
      * 100
```

Verificar:
- Tabs funcionam
- Dados aparecem após sync
- Scores coloridos por faixa

---

## Passo 10 — Feature: Criativos Ativos

1. `pages/CriativosAtivos.tsx` — pode ser implementado diretamente (sem feature folder)
   - Lista de anúncios da `meta_ads_performance` com score
   - Filtros: campanha, período, score
   - Botão "Criar variação" → navega para Criativo com context pré-preenchido

---

## Passo 11 — Feature: Estratégia de Marca

1. `features/strategy/hooks/useStrategy.ts`
2. `features/strategy/components/MetafieldsEditor.tsx`
3. `features/strategy/components/BrandSetupForm.tsx`
4. `pages/Estrategia.tsx` — shell

---

## Passo 12 — Feature: Campanhas

1. `features/campaigns/hooks/useCampaigns.ts`
2. `features/campaigns/components/CampaignForm.tsx`
3. `features/campaigns/components/CampaignCard.tsx`
4. `features/campaigns/components/CampaignList.tsx`
5. `pages/Campanhas.tsx` — shell

---

## Passo 13 — Dashboard (Index)

Criar `pages/Index.tsx` com:
- Cards de métricas rápidas (últimos 7 dias)
- Últimos 3 drafts de carrossel
- Score médio dos criativos ativos
- Atalhos para criar carrossel, lote, ver analytics

---

## Passo 14 — Revisão Final

Antes de considerar o MVP pronto, verificar:

- [ ] Nenhum arquivo ultrapassa 400 linhas
- [ ] Todas as pages fazem lazy loading
- [ ] Nenhum `fetch` direto para IA no frontend
- [ ] Nenhum dado persistente em localStorage
- [ ] Todos os erros de edge function retornam mensagem em português
- [ ] Score criativo calculado corretamente
- [ ] Matching da biblioteca funcionando (busca antes de gerar)
- [ ] Export ZIP dos carrosséis funcionando
- [ ] Export ZIP do batch funcionando
- [ ] Drafts salvam e carregam corretamente
- [ ] Sync de Meta Ads e GA4 funcionando
- [ ] Tagging automático de imagens funcionando
- [ ] VideoIA mostra placeholder "Em breve"

---

## Dúvidas frequentes durante o desenvolvimento

**Q: Devo criar o projeto do zero ou migrar o NEW?**
A: Do zero. A arquitetura do NEW é boa mas os arquivos são monolíticos.
Usar o NEW apenas como referência de lógica.

**Q: Posso usar o mesmo Supabase project do NEW?**
A: Não recomendado. Criar um projeto novo limpo para evitar conflitos de schema.

**Q: E o seedData com campanhas de exemplo?**
A: Criar um script de seed simples em `supabase/seed.sql` com 2-3 campanhas
de exemplo para facilitar o desenvolvimento. Não usar o seedData do MAIN
(que usa localStorage).

**Q: Como testar as edge functions localmente?**
A: `npx supabase functions serve` para rodar localmente.
Usar `npx supabase functions serve ai-router --env-file supabase/functions/.env`
