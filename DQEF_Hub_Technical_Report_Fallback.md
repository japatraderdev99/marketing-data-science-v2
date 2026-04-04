# DQEF Marketing Hub — Relatório Técnico Completo para Replicação

**Data:** 04/04/2026  
**Versão:** 1.0  
**Objetivo:** Documentar toda a arquitetura, banco de dados, edge functions, fluxos de dados e dependências para que um desenvolvedor possa replicar a ferramenta fora do Lovable como fallback de segurança.

---

## 1. STACK TECNOLÓGICO

### 1.1 Frontend
| Tecnologia | Versão | Função |
|---|---|---|
| React | 18.3 | Framework UI |
| Vite | 5.4 | Bundler/Dev Server |
| TypeScript | 5.8 | Tipagem |
| Tailwind CSS | 3.4 | Estilos utility-first |
| React Router DOM | 6.30 | Roteamento SPA |
| TanStack React Query | 5.83 | Cache/fetch de dados |
| Recharts | 2.15 | Gráficos/dashboards |
| @dnd-kit | 6.3/10.0 | Drag-and-drop (Kanban) |
| html-to-image | 1.11 | Export PNG de criativos |
| html2pdf.js | 0.10 | Export PDF de relatórios |
| JSZip | 3.10 | Download em lote (ZIP) |
| Radix UI | various | Componentes headless (dialog, dropdown, tabs, etc.) |
| Shadcn/ui | - | Sistema de componentes (baseado em Radix + Tailwind) |
| Lucide React | 0.462 | Ícones |
| date-fns | 3.6 | Manipulação de datas |
| Zod | 3.25 | Validação de schemas |
| react-hook-form | 7.61 | Formulários |
| Embla Carousel | 8.6 | Carrossel UI |
| Sonner | 1.7 | Toasts/notificações |

### 1.2 Backend (Supabase)
| Componente | Detalhes |
|---|---|
| PostgreSQL | Banco relacional com RLS |
| Supabase Auth | Autenticação email/password |
| Supabase Storage | 3 buckets públicos |
| Edge Functions (Deno) | 28 funções serverless |
| Realtime | WebSocket para fórum |

### 1.3 Provedores de IA
| Provider | Modelos Usados | Acesso |
|---|---|---|
| OpenRouter | Claude Sonnet 4, Claude Opus 4 | API Key (`OPENROUTER_API_KEY`) |
| Lovable AI Gateway | Gemini 2.5 Flash/Pro, Gemini 3 Pro Image | API Key (`LOVABLE_API_KEY`) |
| Perplexity | sonar-pro | API Key (`PERPLEXITY_API_KEY`) |

> **⚠️ ATENÇÃO PARA REPLICAÇÃO:** O Lovable AI Gateway (`https://ai.gateway.lovable.dev`) é exclusivo da plataforma Lovable. Para fallback, substituir por chamadas diretas ao Google AI Studio/Vertex AI para modelos Gemini, usando a mesma API key do Google.

---

## 2. ARQUITETURA DE AUTENTICAÇÃO

### 2.1 Fluxo de Login (Username → Email)
```
Usuário digita username + senha
    ↓
Frontend chama Edge Function "login-lookup"
    ↓
login-lookup busca na tabela "profiles" o email correspondente ao username (case-insensitive via ilike)
    ↓
Retorna email (ou erro genérico "Credenciais inválidas" para prevenir enumeração)
    ↓
Frontend chama supabase.auth.signInWithPassword({ email, password })
    ↓
Supabase Auth valida e retorna JWT + Session
```

### 2.2 Contexto de Auth (React)
Arquivo: `src/contexts/AuthContext.tsx`
- Usa `supabase.auth.onAuthStateChange()` para reatividade
- Expõe `{ user, session, loading, signOut }`
- `ProtectedRoute` redireciona para `/auth` se não autenticado

### 2.3 Tabela profiles
```sql
CREATE TABLE profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  username text NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);
-- RLS: SELECT e UPDATE apenas para auth.uid() = user_id
```

> **⚠️ CRÍTICO:** A tabela `profiles` precisa ser populada manualmente (INSERT) por admin, pois não há RLS de INSERT para authenticated. Para signup self-service futuro, adicionar policy de INSERT.

---

## 3. BANCO DE DADOS — SCHEMA COMPLETO

### 3.1 Mapa de Tabelas (22 tabelas)

#### Tabelas de Dados Principais

**campaigns**
```sql
CREATE TABLE campaigns (
  id text PRIMARY KEY,
  user_id uuid NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,  -- Campaign inteira serializada como JSON
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- RLS: SELECT/INSERT/UPDATE/DELETE para authenticated (global, sem filtro por user)
```
> **Padrão:** Campanhas são armazenadas como JSONB blob. O frontend deserializa para o tipo `Campaign` definido em `src/data/seedData.ts`. Mesma lógica para `calendar_contents`.

**calendar_contents** — Mesmo padrão que campaigns (id text, user_id uuid, data jsonb)

**campaign_tasks**
```sql
CREATE TABLE campaign_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  campaign_id text NOT NULL,
  campaign_name text NOT NULL,
  title text NOT NULL,
  description text,
  creative_type text NOT NULL,
  channel text NOT NULL,
  format_ratio text,
  format_name text,
  format_width integer,
  format_height integer,
  status text NOT NULL DEFAULT 'pending',  -- pending/in_progress/in_review/approved/rejected
  priority text NOT NULL DEFAULT 'Media',
  assigned_to text NOT NULL DEFAULT 'Guilherme',
  deadline date,
  started_at timestamptz,
  completed_at timestamptz,
  campaign_context jsonb DEFAULT '{}'::jsonb,
  creative_output jsonb DEFAULT '{}'::jsonb,
  approved_by text,
  approval_note text,
  drive_link text,
  asset_name text,
  destination_platform text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- RLS: CRUD total para authenticated (global)
```

**creative_drafts** — Rascunhos de carrosséis
```sql
CREATE TABLE creative_drafts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  sigla text NOT NULL,  -- Auto-gerada via function generate_draft_sigla()
  status text NOT NULL DEFAULT 'draft',
  context text,
  angle text,
  persona text,
  channel text,
  tone text,
  format_id text,
  campaign_name text,
  workflow_stage text,
  carousel_data jsonb,
  slide_images jsonb DEFAULT '{}'::jsonb,
  feedback_requests jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- RLS: SELECT/UPDATE global para authenticated; INSERT/DELETE apenas own
```

**active_creatives** — Criativos publicados com métricas
```sql
CREATE TABLE active_creatives (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  file_url text,
  thumbnail_url text,
  platform text,
  format_type text,
  dimensions text,
  campaign_id text,
  status text NOT NULL DEFAULT 'draft',
  tags text[] DEFAULT '{}',
  notes text,
  published_at timestamptz,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  engagement_rate numeric DEFAULT 0,
  conversions integer DEFAULT 0,
  spend numeric DEFAULT 0,
  grid_position integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- RLS: CRUD total para authenticated (global)
```

#### Tabelas de Estratégia e Knowledge Base

**strategy_knowledge** — Documentos da KB (brand books, briefings)
```sql
CREATE TABLE strategy_knowledge (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  document_name text NOT NULL,
  document_url text NOT NULL,
  document_type text,
  file_size integer,
  status text NOT NULL DEFAULT 'pending',  -- pending/processing/done/error
  extracted_knowledge jsonb,  -- JSON com brandName, brandEssence, positioning, toneOfVoice, etc.
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- RLS: SELECT global authenticated; INSERT/UPDATE/DELETE own
```

**competitor_benchmarks** — Análises de concorrentes
```sql
CREATE TABLE competitor_benchmarks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  competitor_name text NOT NULL,
  platform text,
  format_type text,
  file_url text,
  file_name text,
  thumbnail_url text,
  file_size integer,
  notes text,
  tags text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  ai_insights jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**generative_playbooks** — Playbooks de IA para geração visual
```sql
CREATE TABLE generative_playbooks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  playbook_type text NOT NULL,  -- 'image', 'video'
  title text NOT NULL,
  knowledge_json jsonb NOT NULL,  -- Regras de geração (fórmula, brand constraints, etc.)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- RLS: SELECT global; ALL para service_role
```

#### Tabelas de Mídia

**media_library** — Biblioteca de imagens categorizada por IA
```sql
CREATE TABLE media_library (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  url text NOT NULL,
  filename text NOT NULL,
  category text,     -- Ex: 'profissional', 'lifestyle', 'produto'
  tags text[],       -- Tags inteligentes via Claude Sonnet (30+ categorias)
  description text,  -- Descrição semântica gerada por IA
  file_size integer,
  created_at timestamptz DEFAULT now()
);
-- RLS: SELECT global; INSERT/UPDATE/DELETE own
```

**brand_assets** — Logos e assets visuais
**brand_colors** — Paleta de cores (hex, rgb, category: primary/secondary/accent)
**brand_fonts** — Tipografia (nome, peso, uso, URL, sample_text)
**dam_assets** — Assets do Google Drive (DAM)

#### Tabelas de Performance / Analytics

**instagram_posts** — Posts orgânicos sincronizados via Meta Graph API v21.0
```sql
CREATE TABLE instagram_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  instagram_media_id text NOT NULL,
  instagram_account_id text NOT NULL,
  caption text,
  media_type text,  -- IMAGE, VIDEO, CAROUSEL_ALBUM
  media_url text,
  thumbnail_url text,
  permalink text,
  impressions integer DEFAULT 0,
  reach integer DEFAULT 0,
  engagement integer DEFAULT 0,
  likes integer DEFAULT 0,
  comments integer DEFAULT 0,
  saves integer DEFAULT 0,
  shares integer DEFAULT 0,
  video_views integer DEFAULT 0,
  from_hashtags integer DEFAULT 0,
  from_explore integer DEFAULT 0,
  from_profile integer DEFAULT 0,
  from_other integer DEFAULT 0,
  published_at timestamptz,
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
```

**meta_ads_performance** — Performance de anúncios Meta
- Campos: ad_id, adset_id, campaign_id, ad_account_id, impressions, clicks, spend, cpc, cpm, ctr, conversions, roas, etc.
- FK opcional: `draft_id uuid REFERENCES creative_drafts(id)`

**google_ads_campaigns** — Performance Google Ads
- Campos: campaign_id, campaign_name, impressions, clicks, cost, conversions, ctr, avg_cpc, etc.

**ga4_metrics** — Métricas do Google Analytics 4
- Campos: metric_date, sessions, total_users, new_users, page_views, bounce_rate, conversions, revenue, source_medium, etc.

**operational_metrics** — Métricas operacionais genéricas
- Campos: metric_type, metric_date, count, total_value, city, state, metadata (jsonb)

**content_performance_insights** — Padrões detectados por IA
- Campos: insight_type, pattern_data (jsonb), avg_engagement_rate, ai_recommendation

**monthly_reports** — Relatórios mensais do CMO analisados por IA
```sql
CREATE TABLE monthly_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  report_month date NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  extracted_data jsonb DEFAULT '{}'::jsonb,  -- KPIs extraídos: investimento, leads, CPL, ROAS, etc.
  ai_analysis text,  -- Análise markdown completa
  model_used text DEFAULT 'anthropic/claude-sonnet-4',
  created_at timestamptz DEFAULT now()
);
-- RLS: SELECT global authenticated; INSERT own + service_role ALL; DELETE own
```

#### Tabelas de Comunicação

**forum_messages** — Chat realtime
```sql
CREATE TABLE forum_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  author_name text NOT NULL,
  author_initials text NOT NULL DEFAULT '',
  author_role text NOT NULL DEFAULT '',
  content text NOT NULL,
  message_type text NOT NULL DEFAULT 'message',  -- message/task_comment/strategy_change/goal_update/system
  is_ai boolean NOT NULL DEFAULT false,
  is_pinned boolean NOT NULL DEFAULT false,
  metadata jsonb,
  reply_to uuid,  -- Self-reference para replies
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- Realtime habilitado via: ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_messages;
-- RLS: SELECT global authenticated; INSERT own + service_role; UPDATE own + service_role; DELETE own
```

#### Tabelas de Telemetria

**ai_usage_log** — Log de uso de IA
```sql
CREATE TABLE ai_usage_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  function_name text NOT NULL,
  task_type text NOT NULL,
  model_used text NOT NULL,
  provider text NOT NULL DEFAULT 'openrouter',
  tokens_input integer DEFAULT 0,
  tokens_output integer DEFAULT 0,
  cost_estimate numeric DEFAULT 0,
  latency_ms integer DEFAULT 0,
  success boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
-- RLS: INSERT own + service_role; SELECT own only
```

**video_projects** — Projetos de vídeo salvos
- Campos: title, concept, status, briefing_data (jsonb), storyboard (jsonb), shot_frames (jsonb), etc.

### 3.2 Funções do Banco

```sql
-- Gera sigla única para rascunhos: CRI-MMDD-XXXX
CREATE FUNCTION generate_draft_sigla() RETURNS text ...

-- Triggers de updated_at (existem para várias tabelas mas triggers NÃO estão ativos no DB atual)
CREATE FUNCTION update_*_updated_at() RETURNS trigger ...
```

> **⚠️ ATENÇÃO:** Os triggers de `updated_at` estão definidos como funções mas **NÃO estão attachados** como triggers nas tabelas. Para replicação, criar os triggers:
```sql
CREATE TRIGGER set_updated_at BEFORE UPDATE ON campaign_tasks
FOR EACH ROW EXECUTE FUNCTION update_campaign_tasks_updated_at();
-- Repetir para: active_creatives, creative_drafts, creative_suggestions, forum_messages, strategy_knowledge, video_projects
```

### 3.3 Storage Buckets

| Bucket | Público | Uso |
|---|---|---|
| `media-library` | Sim | Imagens da biblioteca + PDFs de relatórios (`reports/<user_id>/`) |
| `brand-assets` | Sim | Logos e assets visuais |
| `benchmarks` | Sim | Documentos de concorrentes |

> **Upload paths:** Imagens vão para `media-library/<user_id>/<timestamp>_<filename>`. Relatórios CMO vão para `media-library/reports/<user_id>/<timestamp>_<filename>`.

---

## 4. EDGE FUNCTIONS — ARQUITETURA COMPLETA

### 4.1 Gateway Central: ai-router

**Arquivo:** `supabase/functions/ai-router/index.ts`  
**Função:** Orquestrador multi-modelo que roteia chamadas por `task_type`.

```
Matriz de Roteamento:
task_type        → Modelo Primário                    → Fallback (Lovable AI)
───────────────────────────────────────────────────────────────────────────
copy             → Claude Sonnet 4 (OpenRouter)       → Gemini 2.5 Flash
strategy         → Claude Opus 4 (OpenRouter)         → Gemini 2.5 Pro
classify         → Gemini 2.5 Flash (Lovable)         → Gemini 2.5 Flash Lite
suggest          → Gemini 2.5 Flash (Lovable)         → Gemini 2.5 Flash Lite
image_hq         → Gemini 3 Pro Image (Lovable)       → —
image_edit       → Gemini 2.5 Flash Image (Lovable)   → —
video            → Gemini 2.5 Flash (Lovable)         → —
analyze          → Claude Sonnet 4 (OpenRouter)       → Gemini 2.5 Flash
weekly_strategy  → Claude Opus 4 (OpenRouter)         → Gemini 2.5 Pro
auto             → OpenRouter Auto                    → Gemini 3 Flash Preview
frame            → Gemini 2.5 Flash Image (Lovable)   → —
```

**Segurança:** Valida JWT ou service_role_key em cada request. Loga em `ai_usage_log`.

**Endpoints de IA:**
- OpenRouter: `https://openrouter.ai/api/v1/chat/completions`
- Lovable AI: `https://ai.gateway.lovable.dev/v1/chat/completions`

> **⚠️ PARA REPLICAÇÃO:** Substituir Lovable AI Gateway por:
> - Gemini: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` (Google AI Studio) ou Vertex AI
> - Manter OpenRouter como está (funciona independente)

### 4.2 Lista Completa de Edge Functions (28)

| # | Função | Modelo | Chamada via | Descrição |
|---|---|---|---|---|
| 1 | **ai-router** | Multi | Direto | Gateway central — roteia task_type → modelo |
| 2 | **login-lookup** | — | Direto | Mapeia username → email para auth |
| 3 | **generate-carousel** | Claude Sonnet 4 | ai-router | Carrossel padrão (5 slides, JSON) |
| 4 | **generate-narrative-carousel** | Claude Sonnet 4 | ai-router | Carrossel narrativo (7-10 slides com arco dramático) |
| 5 | **generate-carousel-visual** | Claude Sonnet 4 | ai-router | Carrossel com image prompts + playbook visual |
| 6 | **generate-slide-image** | Gemini 3 Pro Image | Lovable AI direto | Imagem para slide individual |
| 7 | **generate-video-assets** | Gemini 2.5 Flash + ai-router | Misto | Pipeline vídeo: storyboard, frames, motion prompts |
| 8 | **generate-campaign-plan** | Claude Sonnet 4 | ai-router | Plano de campanha estruturado (JSON) com KB context |
| 9 | **analyze-creative-input** | Claude Sonnet 4 | ai-router | Análise multimodal → sugestões por canal |
| 10 | **analyze-reference** | Claude Sonnet 4 | ai-router | Gera variações de copy a partir de referência |
| 11 | **analyze-brand-document** | Claude Sonnet 4 | ai-router | Extrai conhecimento de brand books para KB |
| 12 | **analyze-benchmark** | Claude Sonnet 4 | ai-router | Analisa peças de concorrentes |
| 13 | **analyze-monthly-report** | Claude Sonnet 4 | OpenRouter direto | Analisa PDF do relatório mensal do CMO |
| 14 | **extract-strategy-metafields** | Claude Sonnet 4 | ai-router | Extrai Meta-Fields (Essência, Persona, Tom) |
| 15 | **fill-playbook-from-knowledge** | Claude Sonnet 4 | ai-router | Preenche playbook a partir da KB |
| 16 | **fill-metafields-from-knowledge** | Claude Sonnet 4 | ai-router | Preenche Meta-Fields a partir da KB |
| 17 | **categorize-media** | Claude Sonnet 4 | OpenRouter direto | Categoriza imagens com 30+ tags semânticas |
| 18 | **suggest-media** | Gemini 2.5 Flash Lite | Lovable AI direto | Ranqueia imagens por relevância semântica |
| 19 | **verify-carousel-facts** | Gemini 2.5 Flash | Lovable AI direto | Fact-checking de claims em carrosséis |
| 20 | **research-topic** | Perplexity sonar-pro | Perplexity API direto | Pesquisa de tópicos com fontes |
| 21 | **forum-ai** | Auto (OpenRouter) | ai-router | IA assistente no fórum (@DQEF) |
| 22 | **weekly-strategy-review** | Claude Opus 4 | ai-router | Revisão semanal cross-data |
| 23 | **meta-diagnose** | Claude Sonnet 4 | ai-router | Diagnóstico de performance Meta |
| 24 | **analytics-diagnosis** | Claude Sonnet 4 | ai-router | Diagnóstico geral de analytics |
| 25 | **sync-meta-insights** | — | Meta Graph API v21.0 | Sincroniza posts orgânicos + ads da Meta |
| 26 | **sync-ga4** | — | Google Analytics Data API | Sincroniza métricas GA4 |
| 27 | **sync-google-ads** | — | Google Ads API | Sincroniza campanhas Google Ads |
| 28 | **sync-firestore-data** | — | Firebase Admin SDK | Sincroniza dados operacionais do Firestore |

### 4.3 Padrão de Chamada entre Functions

```
Frontend (supabase.functions.invoke)
    ↓
Edge Function específica (ex: generate-carousel)
    ↓
fetch(`${SUPABASE_URL}/functions/v1/ai-router`)  ← chamada interna
    ↓ Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}
ai-router → OpenRouter ou Lovable AI
    ↓
Resposta volta pela cadeia
```

> **⚠️ CUIDADO:** Todas as functions usam `verify_jwt = false` no config.toml. A autenticação é feita em código (validação manual do JWT). Para replicação, implementar middleware de auth em cada function.

---

## 5. FRONTEND — MAPA DE MÓDULOS

### 5.1 Rotas (16 páginas protegidas + auth)

| Rota | Componente | Função Principal |
|---|---|---|
| `/auth` | Auth | Login por username |
| `/` | Index (Dashboard) | KPIs executivos, health score |
| `/estrategia` | Estrategia | Playbook (9 seções), KB, Meta-Fields |
| `/forum` | Forum | Chat realtime com IA |
| `/campanhas` | Campanhas | CRUD campanhas, plano IA |
| `/kanban` | Kanban | Board drag-and-drop, tarefas criativas |
| `/calendario` | Calendario | Grade mensal de conteúdo |
| `/biblioteca` | Biblioteca | Ideação IA, biblioteca de mídia |
| `/analytics` | Analytics | 5+ abas: Channels, Marketplace, Funnels, Budget, Relatórios CMO |
| `/criativo` | Criativo | Posts estáticos com IA, variações 15x, export PNG/ZIP |
| `/ai-carrosseis` | AiCarrosseis | 2 modos (Direto + Narrativa), temas visuais |
| `/video-ia` | VideoIA | Pipeline 5 etapas, modo Express |
| `/formatos` | Formatos | Guia de dimensões por plataforma |
| `/criativos-ativos` | CriativosAtivos | Galeria publicados com KPIs |
| `/canais-organicos` | CanaisOrganicos | Hub 5 plataformas, dados Meta reais |
| `/brand-kit` | BrandKit | Logos, cores, fontes |
| `/relatorio` | RelatorioPlataforma | Relatório executivo, export PDF |

### 5.2 Componentes Críticos

- **AppLayout** + **AppSidebar**: Layout com sidebar colapsável, 15 itens de navegação
- **ProtectedRoute**: Guard que verifica `useAuth().user`
- **CampaignKnowledgeSelector**: Injeta documentos da KB como contexto para IA
- **VariationsGrid**: Grid de 15+ variações criativas com export em massa
- **NarrativeSlideCard/Preview**: Preview de slides de carrossel
- **ShotCard / StrategyContextPanel**: Pipeline de vídeo

### 5.3 Hooks Customizados

| Hook | Função |
|---|---|
| `useAuth()` | Contexto de autenticação |
| `useCampaigns()` | CRUD campanhas via Supabase |
| `useCalendarContents()` | CRUD conteúdos do calendário |
| `useLocalStorage()` | Persistência local (legado) |
| `use-mobile` | Detecção de viewport mobile |

---

## 6. SECRETS NECESSÁRIOS (16)

| Secret | Onde Usar | Obrigatório |
|---|---|---|
| `SUPABASE_URL` | Todas as functions | Sim |
| `SUPABASE_ANON_KEY` | Todas as functions | Sim |
| `SUPABASE_SERVICE_ROLE_KEY` | Todas as functions | Sim |
| `SUPABASE_DB_URL` | Conexão direta ao PostgreSQL | Sim |
| `SUPABASE_PUBLISHABLE_KEY` | Frontend (.env) | Sim |
| `OPENROUTER_API_KEY` | ai-router, categorize-media, analyze-monthly-report | Sim |
| `LOVABLE_API_KEY` | ai-router, generate-slide-image, suggest-media, verify-carousel-facts | **Substituir por Google AI** |
| `PERPLEXITY_API_KEY` | research-topic | Sim |
| `META_ACCESS_TOKEN` | sync-meta-insights | Para sync Meta |
| `META_APP_ID` | Meta OAuth (futuro) | Opcional |
| `META_APP_SECRET` | Meta OAuth (futuro) | Opcional |
| `GA4_PROPERTY_ID` | sync-ga4 | Para sync GA4 |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | sync-ga4, sync-google-ads | Para sync Google |
| `GOOGLE_ADS_CUSTOMER_ID` | sync-google-ads | Para sync Ads |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | sync-google-ads | Para sync Ads |
| `GOOGLE_ADS_MANAGER_ID` | sync-google-ads | Para sync Ads |

---

## 7. FLUXOS DE DADOS CRÍTICOS

### 7.1 Ciclo Estratégia → Criação → Publicação
```
Estratégia (KB + Meta-Fields armazenados em strategy_knowledge + localStorage)
    ↓ contexto injetado via CampaignKnowledgeSelector
Campanhas (generate-campaign-plan → campaign_tasks no DB)
    ↓ 
Kanban (drag-and-drop: pending → in_progress → in_review → approved)
    ↓ deep-link com ?taskId= para ferramentas criativas
Criativo / Carrosséis / Video IA (produção com contexto KB)
    ↓ salva em creative_drafts
Aprovação no Kanban → insere em active_creatives
    ↓
Criativos Ativos (galeria com métricas)
    ↓ sync via sync-meta-insights
Canais Orgânicos (dados reais de performance)
```

### 7.2 Fluxo de Categorização de Mídia
```
Upload de imagem (Biblioteca ou durante criação)
    ↓ Comprime PNG→WebP (max 1920px, 82% quality) no frontend
    ↓ Deduplicação por fingerprint (name + size)
    ↓ Upload para Supabase Storage (media-library bucket)
    ↓ Insert em media_library (url, filename, user_id)
    ↓
categorize-media (Claude Sonnet 4 via OpenRouter)
    ↓ Analisa imagem visualmente
    ↓ Retorna: category, tags (30+), description, dignity_check
    ↓ Update em media_library (category, tags, description)
```

### 7.3 Fluxo de Relatório CMO
```
Upload PDF na aba "Relatórios CMO" (Analytics)
    ↓ Upload para storage (media-library/reports/<user_id>/)
    ↓
analyze-monthly-report (Claude Sonnet 4 via OpenRouter)
    ↓ Baixa PDF, converte para base64
    ↓ Envia para Claude com prompt de extração de KPIs
    ↓ Retorna JSON estruturado + markdown
    ↓ Persiste em monthly_reports (extracted_data, ai_analysis)
    ↓
UI: Cards comparativos MoM com KPIs extraídos
```

---

## 8. PONTOS CRÍTICOS PARA REPLICAÇÃO

### 8.1 Substituições Necessárias

| Componente Lovable | Substituto Standalone |
|---|---|
| Supabase via Lovable Cloud | Supabase self-hosted ou Supabase.com direto |
| Lovable AI Gateway | Google AI Studio API ou Vertex AI |
| Edge Functions (Deno) | Supabase Edge Functions (mesmo runtime) ou Cloudflare Workers |
| Lovable deploy automático | `supabase functions deploy` via CLI |

### 8.2 Scripts que Exigem Mais Cuidado

1. **`ai-router/index.ts`** — Coração do sistema. Qualquer erro aqui quebra TODAS as ferramentas de IA. Testar exaustivamente o fallback de providers.

2. **`categorize-media/index.ts`** — Usa Claude Sonnet 4 com taxonomia expandida de 30+ profissões. A qualidade das tags impacta a busca semântica em todo o sistema.

3. **`sync-meta-insights/index.ts`** (314 linhas) — Mais complexo. Descobre páginas, conta IG, sincroniza posts orgânicos + ads, trata paginação da Graph API. Token Meta expira em 60 dias.

4. **`generate-video-assets/index.ts`** — Carrega playbooks do DB, constrói prompts específicos por modelo, tem múltiplas operações (storyboard, frame, motion, image, express).

5. **`weekly-strategy-review/index.ts`** — Agrega dados de 6+ tabelas em paralelo. Se alguma tabela estiver vazia, pode gerar análise imprecisa.

6. **`analyze-monthly-report/index.ts`** — Processa PDFs grandes via base64. Atenção ao limite de tokens do modelo.

### 8.3 Armadilhas Conhecidas

- **RLS PERMISSIVE vs RESTRICTIVE:** Todas as policies atuais são PERMISSIVE. Ter múltiplas policies PERMISSIVE = OR lógico (basta uma permitir). Cuidado ao adicionar novas.
- **Campanhas como JSONB blob:** A tabela `campaigns` armazena o objeto inteiro como JSON. Consultas SQL por campos internos requerem operadores JSONB (`->`, `->>`, `@>`).
- **Seed data:** `src/data/seedData.ts` contém dados iniciais DQEF (campanhas template, personas). Para multi-tenant, substituir por onboarding guiado.
- **Team members hardcoded:** Nomes como "Gabriel", "Guilherme", "Marcelo" estão no código. Para SaaS, migrar para tabela `team_members`.
- **Forum user_id fixo:** IA usa `SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000001"`. Esse UUID precisa existir como referência válida (não precisa ser user real pois forum_messages não tem FK para auth.users).

### 8.4 Variáveis de Ambiente do Frontend (.env)
```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
VITE_SUPABASE_PROJECT_ID=<project-ref>
```

---

## 9. ORDEM DE IMPLEMENTAÇÃO RECOMENDADA

```
1. Provisionar Supabase (self-hosted ou cloud)
2. Executar todas as 22 migrações SQL em ordem cronológica
3. Criar os 3 storage buckets (media-library, brand-assets, benchmarks) como públicos
4. Configurar Supabase Auth (email/password)
5. Inserir profiles manualmente para os usuários iniciais
6. Configurar todos os secrets
7. Deployar edge functions (começar por ai-router, login-lookup)
8. Ajustar frontend: trocar Lovable AI Gateway URL por Google AI direto
9. Build frontend: npm run build (Vite gera static files)
10. Servir frontend via Nginx/Vercel/Cloudflare Pages
11. Habilitar realtime para forum_messages
12. Testar fluxo completo: login → estratégia → campanha → criativo → export
```

---

## 10. MIGRAÇÕES SQL (ORDEM CRONOLÓGICA)

As 22 migrações devem ser executadas na ordem exata dos timestamps:

```
20260220024024 — Tabelas iniciais (profiles, campaign_tasks, active_creatives, etc.)
20260220075446 — creative_drafts, sigla generator
20260220090040 — forum_messages, realtime
20260220095700 — creative_suggestions
20260220231521 — ai_usage_log
20260221004347 — strategy_knowledge, competitor_benchmarks
20260221113306 — media_library, brand_assets, brand_colors, brand_fonts
20260222015438 — video_projects
20260223174853 — generative_playbooks
20260223185955 — dam_assets
20260223210410 — instagram_posts, meta_ads_performance
20260223213438 — content_performance_insights
20260302023127 — Ajustes RLS (shared data access)
20260317150901 — campaigns table (migração de localStorage)
20260319074318 — calendar_contents table
20260319175000 — ga4_metrics
20260321223046 — google_ads_campaigns
20260322084406 — operational_metrics
20260324032704 — Ajustes adicionais
20260402005607 — monthly_reports
20260402010049 — RLS fix monthly_reports (service_role)
20260403023011 — Storage policy para reports
```

> **⚠️ IMPORTANTE:** Cada arquivo .sql contém o DDL completo. Executar com `psql -f <arquivo>` ou via Supabase Dashboard → SQL Editor, respeitando a ordem.

---

## 11. CORES DA MARCA (Design Tokens)

```css
/* tailwind.config.ts → dqef namespace */
dqef-orange: hsl(33 100% 50%)   /* #FF8C00 — Cor primária */
dqef-teal:   hsl(185 100% 36%)  /* #00B8A9 — Cor secundária */
dqef-dark:   hsl(0 0% 5%)       /* #0D0D0D — Background */
dqef-card:   hsl(0 0% 9%)       /* #171717 — Cards */
```

---

**FIM DO RELATÓRIO**

*Este documento contém todas as informações necessárias para reconstruir o DQEF Marketing Hub em qualquer infraestrutura que suporte PostgreSQL + Deno/Node.js + React.*
