# Relatório Completo: DQEF Marketing Hub — Auditoria End-to-End

---

## 1. VISÃO GERAL DA PLATAFORMA

O DQEF Marketing Hub é um sistema operacional de marketing digital composto por **18 módulos frontend** e **21 Edge Functions backend**, orquestrados por um roteador de IA multi-modelo. A plataforma cobre o ciclo completo: estratégia → planejamento → criação → publicação → análise.

**Stack**: React 18 + Vite + TypeScript + Tailwind CSS + Supabase (Cloud)

---

## 2. MAPA COMPLETO DE MÓDULOS

### 2.1 Módulos Frontend (18 páginas)

| # | Rota | Módulo | Função | Persistência |
|---|------|--------|--------|-------------|
| 1 | `/` | **Dashboard** | Health Score, KPIs executivos, funis marketplace, ROAS, velocity, AI Insights | localStorage |
| 2 | `/auth` | **Autenticação** | Login por username → lookup `profiles` → signIn email/password | Supabase Auth |
| 3 | `/estrategia` | **Estratégia** | Playbook (9 seções), Knowledge Base, benchmarks, Meta-Fields por IA | Supabase + localStorage |
| 4 | `/forum` | **Fórum** | Chat realtime com equipe, IA (@DQEF), mensagens fixadas | Supabase (realtime) |
| 5 | `/campanhas` | **Campanhas** | CRUD campanhas, wizard, plano IA, geração automática de tarefas | localStorage + Supabase |
| 6 | `/kanban` | **Kanban** | Board drag-and-drop, cards campanha + tarefas criativas, aprovação | localStorage + Supabase |
| 7 | `/calendario` | **Calendário** | Grade mensal, conteúdo + deadlines de tarefas do DB | localStorage + Supabase |
| 8 | `/biblioteca` | **Biblioteca** | Ideação IA — análise multimodal, sugestões por canal | Supabase |
| 9 | `/analytics` | **Analytics** | 5 abas: Channels, Marketplace, Funnels, Deep Dive, Budget | localStorage |
| 10 | `/criativo` | **AI Criativo** | Posts estáticos com preview visual, export PNG | Supabase + localStorage |
| 11 | `/ai-carrosseis` | **AI Carrosséis** | 2 modos (Direto + Narrativa), temas visuais, media library, drafts | Supabase |
| 12 | `/video-ia` | **Video IA** | Pipeline 5 etapas, modo Express, projetos salvos | Supabase |
| 13 | `/formatos` | **Formatos** | Guia dimensões por plataforma | Estático |
| 14 | `/criativos-ativos` | **Criativos Ativos** | Galeria publicados com KPIs, upload, filtros | Supabase |
| 15 | `/canais-organicos` | **Canais Orgânicos** | Hub 5 plataformas (IG real + mock), KPIs, charts, top posts | Supabase + mock |
| 16 | `/brand-kit` | **Brand Kit** | Logos, cores, fontes da marca | Supabase |
| 17 | `/relatorio` | **Relatório** | Relatório executivo, modelos IA, custos, export PDF | Supabase |
| 18 | `/rotina-criacao` | **Rotina de Criação** | Calendário semanal pilares, geração batch tarefas | Supabase |

### 2.2 Componentes Compartilhados

- `AppLayout` — Layout com sidebar colapsável, breadcrumb, header com avatar/logout
- `AppSidebar` — Navegação com 15 itens, destaque visual para Estratégia e Fórum
- `ProtectedRoute` — Guard de autenticação
- `OnboardingTutorial` — Tutorial de onboarding
- `CampaignKnowledgeSelector` — Seletor de docs da KB para injetar contexto
- `carousel/` — `NarrativeSlideCard`, `NarrativeSlidePreview`
- `video/` — `ShotCard`, `StrategyContextPanel`, `VideoProjectsList`
- `biblioteca/` — `IdeacaoTab`

---

## 3. BACKEND — ARQUITETURA COMPLETA

### 3.1 Banco de Dados (17 tabelas)

| Tabela | Função | RLS |
|--------|--------|-----|
| `profiles` | Username → email mapping para login | SELECT público, UPDATE próprio |
| `campaign_tasks` | Tarefas criativas vinculadas a campanhas | CRUD próprio |
| `active_creatives` | Criativos publicados com métricas | CRUD próprio |
| `creative_drafts` | Rascunhos de carrosséis (sigla auto-gerada) | SELECT global, INSERT/DELETE próprio, UPDATE global |
| `creative_suggestions` | Sugestões da IA (Ideação) | CRUD próprio + service role INSERT |
| `ai_usage_log` | Log de uso de IA (tokens, custo, latência) | INSERT próprio + service role, SELECT próprio |
| `strategy_knowledge` | Documentos da Knowledge Base | CRUD próprio |
| `competitor_benchmarks` | Benchmarks de concorrentes | CRUD próprio |
| `media_library` | Biblioteca de mídias do usuário | CRUD próprio |
| `dam_assets` | Ativos do Google Drive (DAM) | CRUD próprio + service role |
| `brand_assets` | Logos e assets visuais da marca | CRUD próprio |
| `brand_colors` | Paleta de cores da marca | CRUD próprio |
| `brand_fonts` | Tipografia da marca | CRUD próprio |
| `forum_messages` | Mensagens do fórum (realtime) | SELECT global, INSERT/UPDATE próprio + service role |
| `video_projects` | Projetos de vídeo salvos | CRUD próprio |
| `generative_playbooks` | Playbooks de IA (knowledge base técnica) | SELECT global, ALL service role |
| `instagram_posts` | Posts orgânicos sincronizados do Instagram | CRUD próprio + service role |
| `meta_ads_performance` | Performance de anúncios Meta | CRUD próprio + service role |
| `content_performance_insights` | Insights de padrões de conteúdo | CRUD próprio + service role |

### 3.2 Edge Functions (21 funções)

| # | Função | Modelo IA | Tipo | Descrição |
|---|--------|-----------|------|-----------|
| 1 | `ai-router` | Multi-modelo | **Orquestrador** | Roteador central — mapeia task_type para modelo/provider, fallback automático, log de uso |
| 2 | `generate-carousel` | Claude Sonnet 4 | Copy | Carrossel padrão (5 slides) |
| 3 | `generate-narrative-carousel` | Claude Sonnet 4 | Copy | Carrossel narrativo (7-10 slides) com arco dramático |
| 4 | `generate-carousel-visual` | Claude Sonnet 4 | Copy+Visual | Carrossel com image prompts e playbook visual |
| 5 | `generate-slide-image` | Gemini 3 Pro Image | Imagem | Imagem para slide individual usando playbook |
| 6 | `generate-video-assets` | Gemini 2.5 Flash | Vídeo | Pipeline: storyboard → frame → motion prompts |
| 7 | `generate-campaign-plan` | Claude Sonnet 4 | Estratégia | Plano de campanha estruturado (JSON) com KB context |
| 8 | `analyze-creative-input` | Claude Sonnet 4 | Análise | Análise multimodal → sugestões por canal |
| 9 | `analyze-brand-document` | Claude Sonnet 4 | KB | Extrai conhecimento de brand books |
| 10 | `analyze-benchmark` | Claude Sonnet 4 | Benchmark | Analisa peças de concorrentes |
| 11 | `extract-strategy-metafields` | Claude Sonnet 4 | Estratégia | Extrai Meta-Fields (Essência, Persona, Tom) |
| 12 | `fill-playbook-from-knowledge` | Claude Sonnet 4 | KB | Preenche playbook a partir da KB |
| 13 | `fill-metafields-from-knowledge` | Claude Sonnet 4 | KB | Preenche Meta-Fields a partir da KB |
| 14 | `categorize-media` | Gemini 2.5 Flash | Classificação | Categoriza imagens |
| 15 | `suggest-media` | Gemini 2.5 Flash | Sugestão | Ranqueia imagens por relevância semântica |
| 16 | `forum-ai` | Claude Sonnet 4 | Chat | IA assistente no fórum (@DQEF) |
| 17 | `weekly-strategy-review` | Claude Opus 4 | Diagnóstico | Revisão semanal com dados de todas as tabelas |
| 18 | `sync-meta-insights` | — | Data | Sincroniza posts orgânicos + ads da Meta Graph API |
| 19 | `verify-carousel-facts` | Gemini 2.5 Flash | Verificação | Fact-checking de claims em carrosséis |
| 20 | `research-topic` | Perplexity | Pesquisa | Pesquisa de tópicos para carrosséis narrativos |
| 21 | `meta-diagnose` | Claude Sonnet 4 | Análise | Diagnóstico de performance Meta |

### 3.3 Roteamento de IA (ai-router)

```text
task_type       → Modelo Primário              → Fallback (Lovable AI)
─────────────────────────────────────────────────────────────────────
copy            → Claude Sonnet 4 (OpenRouter)  → Gemini 2.5 Flash
strategy        → Claude Opus 4 (OpenRouter)    → Gemini 2.5 Pro
classify        → Gemini 2.5 Flash (Lovable)    → Gemini 2.5 Flash Lite
suggest         → Gemini 2.5 Flash (Lovable)    → Gemini 2.5 Flash Lite
image_hq        → Gemini 3 Pro Image (Lovable)  → —
image_edit      → Gemini 2.5 Flash Image        → —
video           → Gemini 2.5 Flash (Lovable)    → —
analyze         → Claude Sonnet 4 (OpenRouter)  → Gemini 2.5 Flash
weekly_strategy → Claude Opus 4 (OpenRouter)    → Gemini 2.5 Pro
auto            → OpenRouter Auto               → Gemini 3 Flash Preview
```

### 3.4 Secrets (11)

OPENROUTER_API_KEY, LOVABLE_API_KEY, META_ACCESS_TOKEN, META_APP_ID, META_APP_SECRET, PERPLEXITY_API_KEY (connector), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, SUPABASE_PUBLISHABLE_KEY, SUPABASE_DB_URL

### 3.5 Storage Buckets (3)

- `media-library` (público) — Mídias para carrosséis
- `brand-assets` (público) — Logos, assets do Brand Kit
- `benchmarks` (público) — Documentos de benchmarks

---

## 4. FLUXOS DE DADOS PRINCIPAIS

### 4.1 Ciclo Estratégia → Criação → Publicação

```text
Estratégia (KB + Meta-Fields)
    ↓ contexto injetado
Campanhas (plano IA + tarefas)
    ↓ campaign_tasks no DB
Kanban (pending → in_progress → in_review → approved)
    ↓ deep-link com ?taskId=
Criativo / Carrosséis / Video IA (produção com contexto)
    ↓ output salvo
Criativos Ativos (galeria com métricas)
    ↓ sync Meta API
Canais Orgânicos (dados reais de performance)
    ↓ padrões identificados
content_performance_insights → retroalimenta estratégia
```

### 4.2 Modelo de Persistência Híbrido

```text
localStorage:
  - Campanhas (dqef-campaigns)
  - Conteúdos calendário (dqef-contents)
  - Seed data version control
  - Perfil Instagram cache (igProfile)
  - Budget allocation

Supabase (DB):
  - Tarefas criativas, drafts, sugestões
  - Knowledge base, benchmarks, media library
  - Brand kit (assets, cores, fontes)
  - Fórum (realtime)
  - Instagram posts, Meta ads
  - AI usage logs
  - Video projects
```

---

## 5. PROBLEMAS PARA ESCALAR COMO SaaS

### 5.1 Críticos (Bloqueiam multi-tenant)

| # | Problema | Impacto | Solução SaaS |
|---|---------|---------|-------------|
| 1 | **Campanhas em localStorage** | Dados perdidos ao trocar navegador | Migrar para tabela `campaigns` no DB |
| 2 | **Conteúdos calendário em localStorage** | Mesmo problema | Migrar para tabela `calendar_contents` |
| 3 | **Dashboard dados mock** | KPIs estáticos | Conectar a dados reais |
| 4 | **Analytics dados mock** | 5 abas estáticas | Alimentar de tabelas reais |
| 5 | **Auth sem signup** | Sem cadastro self-service | Flow signup + onboarding |
| 6 | **Sem organização/workspace** | Tudo per-user | Tabela `organizations` + `org_members` |
| 7 | **Team members hardcoded** | Gabriel, Guilherme no código | Tabela `team_members` dinâmica |
| 8 | **Sem billing** | Sem controle de uso | Stripe + planos |

### 5.2 Importantes (Qualidade)

| # | Problema | Solução |
|---|---------|---------|
| 9 | RLS RESTRICTIVE | Revisar para PERMISSIVE onde necessário |
| 10 | Seed data DQEF | Onboarding guiado |
| 11 | Sidebar hardcoded | Modular conforme plano |
| 12 | Instagram token expira 60d | Long-lived token refresh |
| 13 | Edge functions sem verify_jwt | 19/21 vulneráveis |
| 14 | creative_drafts SELECT/UPDATE global | Scoping por user/org |
| 15 | forum_messages SELECT global | Scoping por org |

### 5.3 Melhorias para Diferenciação

| # | Feature | Valor |
|---|---------|-------|
| 16 | Multi-channel real (Facebook, TikTok API) | Dados reais em todas as abas |
| 17 | Scheduling nativo | Publicar via API |
| 18 | A/B testing copies | Testar variações |
| 19 | White-label | Customização logo/cores |
| 20 | Webhooks + integrações | Zapier, n8n, Slack |
| 21 | Mobile responsive | Otimizar todas as páginas |

---

## 6. ARQUITETURA SaaS RECOMENDADA

```text
Camada 1: Multi-Tenant
  organizations → org_members → user_roles
  Todas tabelas com org_id + user_id

Camada 2: Feature Flags
  org_features (plano → features habilitadas)
  Limites: posts/mês, IA calls/mês, storage MB

Camada 3: Billing
  Stripe → subscriptions → usage metering
  Starter (1 canal, 100 IA), Pro (5 canais, 1000), Enterprise (ilimitado)

Camada 4: Onboarding
  Wizard: criar org → conectar IG → brand kit → estratégia
  Templates por indústria

Camada 5: API Pública
  REST endpoints + Webhooks
```

---

## 7. MÉTRICAS DO CODEBASE

| Métrica | Valor |
|---------|-------|
| Páginas React | 18 |
| Edge Functions | 21 |
| Tabelas Supabase | 17 |
| Secrets | 11 |
| Storage buckets | 3 |
| Modelos IA | 8+ |
| Providers IA | 3 (OpenRouter, Lovable AI, Perplexity) |
| Linhas de código | ~18.000+ |
| Dependências NPM | 45 |

---

## 8. CONCLUSÃO

MVP funcional e robusto. Prioridades para SaaS:
1. Migrar localStorage → DB
2. Multi-tenant (organizations + roles)
3. Signup self-service + onboarding
4. Billing com Stripe
5. Segurança: JWT + RLS
