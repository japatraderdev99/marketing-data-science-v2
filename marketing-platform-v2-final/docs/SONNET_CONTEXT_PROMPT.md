# Prompt de Contexto — Nova Sessão (Integrações API + Ferramentas de Criação)

Cole este prompt inteiro ao iniciar uma nova janela com o Sonnet/Opus.

---

## Contexto do Projeto

Estou construindo o **DQEF Studio v2** — uma plataforma de marketing com IA para autônomos brasileiros. Stack: React + Vite + TypeScript + Tailwind + Supabase (Postgres + Auth + Storage + Edge Functions em Deno). Tudo sob multi-tenancy com workspace_id + RLS.

**Diretório:** `/Users/gabrielcasarin/Documents/Marketing-data-science-final/marketing-platform-v2-final/app/`

**Leia OBRIGATORIAMENTE antes de agir:**
- `CLAUDE.md` (raiz) — regras gerais, DNA da marca, docs order
- `docs/RULES.md` — 400 linhas max, React Query obrigatório, sem useState+fetch
- `docs/ARCHITECTURE.md` — stack, pastas, padrões
- `docs/AI_SYSTEM.md` — orquestração IA, task routing

**Node:** `/usr/local/bin/node` (não está no PATH, usar caminho absoluto)
**Dev server:** `cd marketing-platform-v2-final/app && /usr/local/bin/node node_modules/.bin/vite --host`

---

## O que já está PRONTO e FUNCIONANDO

### Infraestrutura
- Supabase project: `pynlxpsdeeqamsbvparg`
- 11 SQL migrations aplicadas (001-010 + 011 brand_kit)
- 11 edge functions deployed: ai-router, generate-carousel-visual, generate-creative-batch, generate-narrative-carousel, generate-slide-image, tag-media, meta-diagnose, sync-firestore-data, sync-ga4, sync-google-ads, sync-meta-insights
- Storage buckets: media, knowledge, brand-assets
- Secrets configurados: OPENROUTER_API_KEY, GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

### Frontend completo
- **Analytics Dashboard** — 6 tabs conectados a dados reais via 12 React Query hooks
- **Media Library** — upload → Supabase Storage → DB record → tag-media edge function → poll tagging
- **Brand Kit** — CRUD completo: logos (upload + favorite), cores (hex picker), fontes (weight + usage)
- **Auth** — login/register com workspace auto-creation
- **Ferramentas de criação (parcialmente):**
  - DirectCarousel: gera texto via edge function + export ZIP ✓
  - NarrativeCarousel: gera texto via edge function + export ZIP ✓
  - CriativoBatch: gera variações de texto, MAS não gera imagens ⚠️
  - ArteUnica: gera slide único, MAS download button sem handler ⚠️

---

## O QUE PRECISA SER FEITO (seu escopo)

### 1. URGENTE — Corrigir creative_drafts column mismatch

O TypeScript interface usa nomes diferentes das colunas reais do banco:

```
DB (migration 005):    type (text), data (jsonb), status ('draft','approved','published','archived')
TS (types/index.ts):   draft_type,  content_json,  status ('draft','approved','exported')
```

**Arquivo:** `app/src/types/index.ts` linhas 198-207
**Migração:** `supabase/migrations/20260401000005_creative_drafts.sql`

Opções: (A) alterar o TS para corresponder ao DB, ou (B) criar migration ALTER TABLE. Recomendo opção A — alterar o TS é mais simples e sem risco.

### 2. URGENTE — Persistir criativos no banco

Nenhuma ferramenta de criação salva os resultados no banco. Tudo fica em state local e se perde ao navegar. Criar hooks:

```
src/features/criativo/hooks/useCreativeDrafts.ts
- useSaveDraft(type, title, data) → insert into creative_drafts
- useMyDrafts(type?) → select com filtro
- useUpdateDraftStatus(id, status)
```

Integrar nos 4 componentes: após gerar, salvar automaticamente como draft.

### 3. URGENTE — Corrigir ArteUnica download

**Arquivo:** `app/src/features/criativo/ArteUnica.tsx`
O botão de download existe visualmente mas não tem onClick handler. Implementar usando html-to-image (já instalado) seguindo o mesmo padrão do CriativoBatch.

### 4. IMPORTANTE — Ativar geração de imagens no CriativoBatch

**Arquivo:** `app/src/features/criativo/CriativoBatch.tsx`
A edge function `generate-slide-image` existe e funciona (usa Gemini 3 Pro Image via OpenRouter), mas nunca é chamada pelo CriativoBatch. Cada variação gerada tem `mediaUrl: null`.

Implementar: após gerar variações de texto, chamar `generate-slide-image` para cada uma (ou em paralelo com Promise.all chunks de 3).

### 5. IMPORTANTE — Integrar Media Library no pipeline criativo

Quando o usuário seleciona uma imagem da Media Library para usar num criativo, ela deve ser passada como `background_url` para os componentes de slide. Hoje a Media Library e os criativos são mundos separados.

### 6. CONFIGURAR — Secrets de sync de dados

Os 5 edge functions de sync (meta-insights, ga4, google-ads, firestore-data, meta-diagnose) estão prontos no código mas não funcionam sem secrets:

```bash
supabase secrets set META_ACCESS_TOKEN="..."
supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
supabase secrets set GA4_PROPERTY_ID="..."
supabase secrets set GOOGLE_ADS_DEVELOPER_TOKEN="..."
supabase secrets set GOOGLE_ADS_CUSTOMER_ID="..."
supabase secrets set GOOGLE_ADS_MANAGER_ID="..."
```

Isso requer credenciais reais do Gabriel — pedir quando necessário.

### 7. PRÓXIMO — Campanhas CRUD

Tabela `campaigns` já existe na migration 004. Criar:
- `src/features/campanhas/hooks/useCampaigns.ts` — CRUD hooks
- `src/features/campanhas/CampanhasList.tsx` — listagem com filtros
- `src/features/campanhas/CampanhaForm.tsx` — form de criação/edição
- `src/pages/Campanhas.tsx` — page component

### 8. FUTURO — Páginas restantes

Kanban, Calendário, Video IA, Formatos — implementar após Campanhas estar sólido.

---

## Padrões obrigatórios

- **React Query** para TODO server state (proibido useState+useEffect+fetch)
- **Nenhum arquivo > 400 linhas** (pages max 100, hooks max 150, edge functions max 300)
- **Feature-based structure:** `src/features/[feature]/hooks/`, `src/features/[feature]/components/`
- **Workspace-scoped:** toda query filtra por workspace_id do useAuth()
- **Cor primária:** `#E8603C`, tipografia: Montserrat 900 UPPERCASE
- **Português brasileiro** em toda UI

---

## Arquivos-chave para referência

```
app/src/types/index.ts                              — todas as interfaces
app/src/contexts/AuthContext.tsx                      — useAuth() → user, workspaceId
app/src/lib/supabase.ts                              — client configurado
app/src/features/criativo/ArteUnica.tsx               — fix download
app/src/features/criativo/CriativoBatch.tsx           — add image gen
app/src/features/carousel/DirectCarousel.tsx          — referência funcional
app/src/features/carousel/NarrativeCarousel.tsx       — referência funcional
app/src/features/media/hooks/useMediaLibrary.ts       — padrão de hooks
app/src/features/brand-kit/hooks/useBrandKit.ts       — padrão de hooks CRUD
supabase/functions/generate-slide-image/index.ts      — image gen edge function
supabase/functions/ai-router/index.ts                 — AI routing logic
supabase/migrations/20260401000005_creative_drafts.sql — schema dos drafts
```
